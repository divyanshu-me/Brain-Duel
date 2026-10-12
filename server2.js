const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

const PORT = process.env.PORT || 5000;

// Data stores
const createdQuizzes = {};
const activeRooms = {};

io.on("connection", (socket) => {
  console.log("user connected", socket.id);

  socket.on("createQuiz", (quizData) => {
    const { roomId, quizName, questions } = quizData;
    if (
      !roomId ||
      !quizName ||
      !questions ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      socket.emit("quizCreationError", "Invalid quiz data");
      return;
    }

    if (createdQuizzes[roomId]) {
      socket.emit("quizCreationError", "Room ID already exists");
      return;
    }

    const sanitized = questions.map((q) => ({
      question: String(q.question || "").trim(),
      answers: (q.answers || []).map((a) => ({
        text: String(a.text || "").trim(),
        correct: !!a.correct,
      })),
    }));

    createdQuizzes[roomId] = {
      quizName,
      questions: sanitized,
      creator: socket.id,
      createdAt: new Date().toISOString(),
    };
    socket.emit("quizCreated", { roomId, quizName });
  });

  socket.on("joinRoom", (room, name) => {
    name = String(name || "Anonymous").trim();
    if (!room) return;

    socket.join(room);

    if (!activeRooms[room]) {
      const quiz = createdQuizzes[room];
      if (!quiz) {
        socket.emit("quizNotFound");
        return;
      }

      activeRooms[room] = {
        players: [],
        currentQuestionIndex: 0,
        questions: quiz.questions,
        status: "waiting",
        timer: null,
      };
    }

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

    if (roomData.players.length >= 2 && roomData.status === "waiting") {
      startGame(room);
    }
  });

  socket.on("submitAnswer", (room, answerIndex) => {
    const roomData = activeRooms[room];
    if (!roomData || roomData.status !== "playing") return;

    const player = roomData.players.find((p) => p.id === socket.id);
    if (!player || player.answered) return;

    const currentQuestion = roomData.questions[roomData.currentQuestionIndex];
    const idx = parseInt(answerIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= currentQuestion.answers.length) return;

    const isCorrect = !!currentQuestion.answers[idx].correct;
    player.answered = true;
    player.lastAnswerCorrect = isCorrect;
    if (isCorrect) player.score += 10;

    io.to(room).emit(
      "scoresUpdate",
      roomData.players.map((p) => ({ name: p.name, score: p.score }))
    );

    if (roomData.players.every((p) => p.answered)) {
      clearTimeout(roomData.timer);
      revealAndNext(room);
    }
  });

  socket.on("leaveRoom", (room, name) => {
    socket.leave(room);
    const roomData = activeRooms[room];
    if (!roomData) return;

    roomData.players = roomData.players.filter((p) => p.id !== socket.id);
    io.to(room).emit("message", `${name || "Player"} left`);

    if (roomData.players.length === 0) {
      clearTimeout(roomData.timer);
      delete activeRooms[room];
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
          clearTimeout(r.timer);
          delete activeRooms[room];
        }
      }
    });
  });
});

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

  io.to(room).emit("newQuestion", {
    question: question.question,
    answers: question.answers.map((a) => a.text),
    questionNumber: questionIndex + 1,
    totalQuestions: roomData.questions.length,
    scores: roomData.players.map((p) => ({ name: p.name, score: p.score })),
  });

  clearTimeout(roomData.timer);
  roomData.timer = setTimeout(() => revealAndNext(room), 30000);
}

function revealAndNext(room) {
  const roomData = activeRooms[room];
  if (!roomData) return;
  const q = roomData.questions[roomData.currentQuestionIndex];

  const correctIndexes = q.answers
    .map((a, i) => (a.correct ? i : -1))
    .filter((i) => i !== -1);

  io.to(room).emit("reveal", {
    correctIndexes,
    players: roomData.players.map((p) => ({
      name: p.name,
      score: p.score,
      lastAnswerCorrect: p.lastAnswerCorrect,
    })),
  });

  setTimeout(() => {
    const next = roomData.currentQuestionIndex + 1;
    next < roomData.questions.length ? askQuestion(room, next) : endGame(room);
  }, 3000);
}

function endGame(room) {
  const roomData = activeRooms[room];
  if (!roomData) return;
  roomData.status = "finished";

  let winner = null;
  let maxScore = -1;
  roomData.players.forEach((p) => {
    if (p.score > maxScore) {
      maxScore = p.score;
      winner = p;
    }
  });

  io.to(room).emit("gameOver", {
    winner: winner ? winner.name : "No one",
    scores: roomData.players.map((p) => ({ name: p.name, score: p.score })),
  });

  clearTimeout(roomData.timer);
  setTimeout(() => delete activeRooms[room], 30000);
}

server.listen(PORT, () => console.log(`Server running on ${PORT}`));
