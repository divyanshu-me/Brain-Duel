// Quiz Clash real-time logic  (namespace: /quiz)
// This is your original server2.js. The game flow and event names are the same.
// Fixed on top of it: the reveal-gap race, ties, join-before-check, server-side
// validation, replaying a finished room, and rooms stalling when a player leaves.
// Version 3: quizzes are saved in MongoDB (models/quiz.model.js) so they survive a restart.
// Only the LIVE game state (players, scores, timers, status) is still kept in memory.
//
// Events the CLIENT sends : createQuiz, joinRoom, submitAnswer, leaveRoom
// Events the SERVER sends : quizCreated, quizCreationError, quizNotFound, message,
//                           newQuestion, scoresUpdate, reveal, gameOver

import {
  MAX_NAME_LENGTH,
  QUIZ_MAX_ANSWER_LENGTH,
  QUIZ_MAX_ANSWERS,
  QUIZ_MAX_QUESTION_LENGTH,
  QUIZ_MAX_QUESTIONS,
  QUIZ_MIN_ANSWERS,
  QUIZ_MIN_PLAYERS,
  QUIZ_POINTS_PER_CORRECT,
  QUIZ_QUESTION_TIME_MS,
  QUIZ_REVEAL_DELAY_MS,
  QUIZ_ROOM_CLEANUP_MS,
} from "../constants.js";
import { Quiz } from "../models/quiz.model.js";

// Saved quizzes live in MongoDB. This object holds only the LIVE games (lost on restart, which is fine).
const activeRooms = {}; // roomId -> { players, currentQuestionIndex, questions, status, timer, nextTimer }
// room status: "waiting" -> "playing" -> "revealing" -> "playing" ... -> "finished"

const asText = (value) => String(value ?? "").trim();

const registerQuiz = (io) => {
  // ---------- game loop helpers (use the namespace `io`) ----------

  // Remove a room completely: stop its timers and make every socket leave it
  function discardRoom(room) {
    const roomData = activeRooms[room];
    if (!roomData) return;
    clearTimeout(roomData.timer);
    clearTimeout(roomData.nextTimer);
    delete activeRooms[room];
    io.in(room).socketsLeave(room);
  }

  function startGame(room) {
    const roomData = activeRooms[room];
    if (!roomData) return;
    roomData.status = "playing";
    askQuestion(room, 0);
  }

  function askQuestion(room, questionIndex) {
    const roomData = activeRooms[room];
    if (!roomData) return;
    roomData.currentQuestionIndex = questionIndex;
    const question = roomData.questions[questionIndex];

    roomData.players.forEach((p) => {
      p.answered = false;
      p.lastAnswerCorrect = false;
    });

    // Only the answer TEXT is sent. The "correct" flags never leave the server.
    io.to(room).emit("newQuestion", {
      question: question.question,
      answers: question.answers.map((a) => a.text),
      questionNumber: questionIndex + 1,
      totalQuestions: roomData.questions.length,
      scores: roomData.players.map((p) => ({ name: p.name, score: p.score })),
    });

    // KNOWN ISSUE #12: the client runs its own separate 30s countdown.
    clearTimeout(roomData.timer);
    roomData.timer = setTimeout(() => revealAndNext(room), QUIZ_QUESTION_TIME_MS);
  }

  function revealAndNext(room) {
    const roomData = activeRooms[room];
    // Only a question that is still "playing" can be revealed. This blocks a second
    // reveal (which used to skip a question) and answers sent during the pause.
    if (!roomData || roomData.status !== "playing") return;
    roomData.status = "revealing";
    clearTimeout(roomData.timer);

    const q = roomData.questions[roomData.currentQuestionIndex];
    const correctIndexes = q.answers.map((a, i) => (a.correct ? i : -1)).filter((i) => i !== -1);

    io.to(room).emit("reveal", {
      correctIndexes,
      players: roomData.players.map((p) => ({
        name: p.name,
        score: p.score,
        lastAnswerCorrect: p.lastAnswerCorrect,
      })),
    });

    roomData.nextTimer = setTimeout(() => {
      if (activeRooms[room] !== roomData) return; // room was removed during the pause
      const next = roomData.currentQuestionIndex + 1;
      if (next < roomData.questions.length) {
        roomData.status = "playing";
        askQuestion(room, next);
      } else {
        endGame(room);
      }
    }, QUIZ_REVEAL_DELAY_MS);
  }

  // If everyone still in the room has answered, do not wait for the timer
  function revealIfEveryoneAnswered(room) {
    const roomData = activeRooms[room];
    if (!roomData || roomData.status !== "playing") return;
    if (roomData.players.length > 0 && roomData.players.every((p) => p.answered)) {
      revealAndNext(room);
    }
  }

  function endGame(room) {
    const roomData = activeRooms[room];
    if (!roomData) return;
    roomData.status = "finished";

    // Everyone with the highest score wins. More than one means a tie.
    const maxScore = Math.max(...roomData.players.map((p) => p.score), 0);
    const winners = roomData.players.filter((p) => p.score === maxScore);

    io.to(room).emit("gameOver", {
      winner: winners.length > 0 ? winners.map((p) => p.name).join(" & ") : "No one",
      isTie: winners.length > 1,
      scores: roomData.players.map((p) => ({ name: p.name, score: p.score })),
    });

    clearTimeout(roomData.timer);
    setTimeout(() => {
      if (activeRooms[room] === roomData) discardRoom(room);
    }, QUIZ_ROOM_CLEANUP_MS);
  }

  // Returns an error message, or null if the quiz is fine
  function validateQuiz(roomId, quizName, questions) {
    if (!roomId || !quizName || !Array.isArray(questions) || questions.length === 0) {
      return "Invalid quiz data";
    }
    if (roomId.length > MAX_NAME_LENGTH || quizName.length > MAX_NAME_LENGTH) {
      return `Room ID and quiz name can be at most ${MAX_NAME_LENGTH} characters`;
    }
    if (questions.length > QUIZ_MAX_QUESTIONS) {
      return `A quiz can have at most ${QUIZ_MAX_QUESTIONS} questions`;
    }
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const label = `Question ${i + 1}`;
      if (!q.question) return `${label} is empty`;
      if (q.question.length > QUIZ_MAX_QUESTION_LENGTH) {
        return `${label} is too long (max ${QUIZ_MAX_QUESTION_LENGTH} characters)`;
      }
      if (q.answers.length < QUIZ_MIN_ANSWERS || q.answers.length > QUIZ_MAX_ANSWERS) {
        return `${label} needs ${QUIZ_MIN_ANSWERS} to ${QUIZ_MAX_ANSWERS} answers`;
      }
      if (q.answers.some((a) => !a.text || a.text.length > QUIZ_MAX_ANSWER_LENGTH)) {
        return `${label} has an empty or too long answer (max ${QUIZ_MAX_ANSWER_LENGTH} characters)`;
      }
      if (!q.answers.some((a) => a.correct)) {
        return `${label} needs at least one correct answer`;
      }
    }
    return null;
  }

  // ---------- socket events ----------

  io.on("connection", (socket) => {
    console.log("user connected", socket.id);

    socket.on("createQuiz", async (quizData) => {
      const roomId = asText(quizData?.roomId);
      const quizName = asText(quizData?.quizName);
      const rawQuestions = quizData?.questions;

      const sanitized = Array.isArray(rawQuestions)
        ? rawQuestions.map((q) => ({
            question: asText(q?.question),
            answers: (Array.isArray(q?.answers) ? q.answers : []).map((a) => ({
              text: asText(a?.text),
              correct: !!a?.correct,
            })),
          }))
        : rawQuestions;

      const error = validateQuiz(roomId, quizName, sanitized);
      if (error) {
        socket.emit("quizCreationError", error);
        return;
      }

      try {
        // KNOWN ISSUE #10: `creator` is stored but never used (no host / start button).
        await Quiz.create({ roomId, quizName, questions: sanitized, creator: socket.id });
      } catch (err) {
        if (err.code === 11000) {
          // the unique index on roomId rejected it (this also covers two people saving at once)
          socket.emit("quizCreationError", "Room ID already exists");
        } else {
          console.log("createQuiz failed:", err.message);
          socket.emit("quizCreationError", "Could not save the quiz. Please try again.");
        }
        return;
      }
      socket.emit("quizCreated", { roomId, quizName });
    });

    socket.on("joinRoom", async (room, name) => {
      room = asText(room);
      name = asText(name).slice(0, MAX_NAME_LENGTH) || "Anonymous";
      if (!room) return;

      // A finished game is replaced by a fresh one, so the same room ID can be played again
      if (activeRooms[room]?.status === "finished") discardRoom(room);

      if (!activeRooms[room]) {
        // No live game yet, so load the saved quiz from MongoDB.
        // `room` is already a trimmed string (asText), so it cannot be used for query injection.
        let quiz;
        try {
          quiz = await Quiz.findOne({ roomId: room }).lean();
        } catch (err) {
          console.log("joinRoom failed:", err.message);
          socket.emit("message", "Could not load the quiz. Please try again.");
          return;
        }
        if (!quiz) {
          socket.emit("quizNotFound"); // the socket has NOT joined anything yet
          return;
        }

        // The database call takes time. The player may have left, or another player may
        // have created this live room while we were waiting, so check again before using it.
        if (!socket.connected) return;
        if (!activeRooms[room]) {
          activeRooms[room] = {
            players: [],
            currentQuestionIndex: 0,
            questions: quiz.questions,
            status: "waiting",
            timer: null,
            nextTimer: null,
          };
        }
      }

      socket.join(room);
      const roomData = activeRooms[room];

      if (!roomData.players.some((p) => p.id === socket.id)) {
        roomData.players.push({
          id: socket.id,
          name,
          score: 0,
          answered: false,
          lastAnswerCorrect: false,
        });
      }

      io.to(room).emit("message", `${name} joined!`);

      // someone joining mid-question gets the current question straight away
      if (roomData.status === "playing") {
        const q = roomData.questions[roomData.currentQuestionIndex];
        socket.emit("newQuestion", {
          question: q.question,
          answers: q.answers.map((a) => a.text),
          questionNumber: roomData.currentQuestionIndex + 1,
          totalQuestions: roomData.questions.length,
          scores: roomData.players.map((p) => ({ name: p.name, score: p.score })),
        });
      }

      // auto-start when enough players have joined
      if (roomData.players.length >= QUIZ_MIN_PLAYERS && roomData.status === "waiting") {
        startGame(room);
      }
    });

    socket.on("submitAnswer", (room, answerIndex) => {
      const roomData = activeRooms[asText(room)];
      // not "playing" (waiting, revealing, finished) means no answers are accepted
      if (!roomData || roomData.status !== "playing") return;

      const player = roomData.players.find((p) => p.id === socket.id);
      if (!player || player.answered) return;

      const currentQuestion = roomData.questions[roomData.currentQuestionIndex];
      const idx = parseInt(answerIndex, 10);
      if (isNaN(idx) || idx < 0 || idx >= currentQuestion.answers.length) return;

      const isCorrect = !!currentQuestion.answers[idx].correct;
      player.answered = true;
      player.lastAnswerCorrect = isCorrect;
      if (isCorrect) player.score += QUIZ_POINTS_PER_CORRECT;

      // KNOWN ISSUE #13: broadcasting scores immediately lets others see who was correct.
      io.to(asText(room)).emit(
        "scoresUpdate",
        roomData.players.map((p) => ({ name: p.name, score: p.score }))
      );

      revealIfEveryoneAnswered(asText(room));
    });

    socket.on("leaveRoom", (room, name) => {
      room = asText(room);
      socket.leave(room);
      const roomData = activeRooms[room];
      if (!roomData) return;

      roomData.players = roomData.players.filter((p) => p.id !== socket.id);
      io.to(room).emit("message", `${asText(name) || "Player"} left`);

      if (roomData.players.length === 0) {
        discardRoom(room);
      } else {
        revealIfEveryoneAnswered(room); // the leaver may have been the last one we waited for
      }
    });

    socket.on("disconnect", () => {
      Object.keys(activeRooms).forEach((room) => {
        const r = activeRooms[room];
        const idx = r.players.findIndex((p) => p.id === socket.id);
        if (idx !== -1) {
          const [removed] = r.players.splice(idx, 1);
          io.to(room).emit("message", `${removed.name} disconnected`);
          io.to(room).emit(
            "scoresUpdate",
            r.players.map((p) => ({ name: p.name, score: p.score }))
          );
          if (r.players.length === 0) {
            discardRoom(room);
          } else {
            revealIfEveryoneAnswered(room);
          }
        }
      });
    });
  });
};

export { registerQuiz };
