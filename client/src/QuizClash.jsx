import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client";
import "./QuizClash.css";

import { SERVER_URL, QUIZ_NAMESPACE } from "./constants";
const SOCKET_URL = `${SERVER_URL}${QUIZ_NAMESPACE}`;
const socket = io(SOCKET_URL, { autoConnect: false });

export default function QuizClash() {
  const [mode, setMode] = useState(null); // null | 'create' | 'play'

  // create mode
  const [quizName, setQuizName] = useState("");
  const [room, setRoom] = useState("");
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState({
    question: "",
    answers: [
      { text: "", correct: false },
      { text: "", correct: false },
      { text: "", correct: false },
      { text: "", correct: false },
    ],
  });
  const [quizCreated, setQuizCreated] = useState(false);

  // play mode
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);
  const [currentQ, setCurrentQ] = useState(null); // { question, answers, questionNumber, totalQuestions }
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef(null);
  const [answered, setAnswered] = useState(false);
  const [scores, setScores] = useState([]);
  const [reveal, setReveal] = useState(null); // { correctIndexes: [] }
  const [winner, setWinner] = useState(null);
  const [isTie, setIsTie] = useState(false);

  // connect socket when user chooses any mode (lazy connect)
  useEffect(() => {
    socket.connect();

    // General notifications
    socket.on("message", (msg) => {
      toast(msg, { position: "top-right", autoClose: 3000 });
    });

    socket.on("quizCreated", (data) => {
      setQuizCreated(true);
      setRoom(data.roomId);
      toast.success(
        `Quiz \"${data.quizName}\" created in room ${data.roomId}`,
        { position: "top-center" }
      );
    });

    socket.on("quizCreationError", (err) => {
      toast.error(err, { position: "top-center" });
    });

    socket.on("quizNotFound", () => {
      setJoined(false); // the join screen was shown too early, go back to the form
      toast.error("Quiz not found for this room ID", {
        position: "top-center",
      });
    });

    socket.on("connect_error", () => {
      // toastId stops the same toast from piling up while socket.io keeps retrying
      toast.error("Cannot reach the server. Is it running?", {
        position: "top-center",
        toastId: "connect-error",
      });
    });

    // Gameplay events
    socket.on("newQuestion", (payload) => {
      // payload: { question, answers: [texts], questionNumber, totalQuestions, scores }
      setCurrentQ(payload);
      setReveal(null);
      setAnswered(false);

      // reset & start timer
      setSeconds(30);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      if (payload.scores) setScores(payload.scores);
    });

    socket.on("scoresUpdate", (updatedScores) => {
      setScores(updatedScores);
    });

    socket.on("reveal", (payload) => {
      // payload: { correctIndexes: [], players }
      setReveal(payload);

      // stop timer
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on("gameOver", (payload) => {
      setWinner(payload.winner);
      setIsTie(!!payload.isTie);
      setScores(payload.scores);
    });

    return () => {
      socket.off();
      if (timerRef.current) clearInterval(timerRef.current);
      socket.disconnect();
    };
  }, []);

  // CREATE: add question
  function handleAddQuestion() {
    if (!currentQuestion.question.trim()) return toast.error("Enter question");
    if (currentQuestion.answers.some((a) => !a.text.trim()))
      return toast.error("Fill all options");
    if (!currentQuestion.answers.some((a) => a.correct))
      return toast.error("Mark at least one correct option");

    setQuestions((prev) => [...prev, currentQuestion]);

    setCurrentQuestion({
      question: "",
      answers: [
        { text: "", correct: false },
        { text: "", correct: false },
        { text: "", correct: false },
        { text: "", correct: false },
      ],
    });

    toast.success("Question added");
  }

  function handleCreateQuiz() {
    if (!quizName.trim()) return toast.error("Enter quiz name");
    if (!room.trim()) return toast.error("Enter room id");
    if (questions.length === 0) return toast.error("Add at least one question");

    socket.emit("createQuiz", {
      roomId: room.trim(),
      quizName: quizName.trim(),
      questions,
    });
  }

  // PLAY: join room
  function handleJoinRoom(e) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanRoom = room.trim();
    if (!cleanName || !cleanRoom) return toast.error("Enter name and room id");
    // store the trimmed values, later events (submitAnswer) must use the same room id
    setName(cleanName);
    setRoom(cleanRoom);
    socket.emit("joinRoom", cleanRoom, cleanName);
    setJoined(true);
  }

  // Clear everything that belongs to a finished or abandoned game, so the next game
  // starts on a clean screen. (The old code kept the last question and result.)
  function resetPlayState() {
    if (timerRef.current) clearInterval(timerRef.current);
    setJoined(false);
    setCurrentQ(null);
    setReveal(null);
    setAnswered(false);
    setSeconds(0);
    setScores([]);
    setWinner(null);
    setIsTie(false);
    setName("");
    setRoom("");
  }

  function handleAnswer(index) {
    if (answered || !currentQ) return;
    setAnswered(true);
    socket.emit("submitAnswer", room, index);
  }

  // UI -----------------------------------------------------------------
  if (mode === null) {
    return (
      <div className="app">
        <ToastContainer />
        <h1>QuizClash 💡</h1>
        <div>
          <button onClick={() => setMode("play")}>Play Quiz</button>
          <button onClick={() => setMode("create")}>Create Quiz</button>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="app">
        <ToastContainer />
        <h1>Create Quiz ✏️</h1>
        {quizCreated ? (
          <div>
            <h2>Quiz Created!</h2>
            <p>
              Quiz: <strong>{quizName}</strong>
            </p>
            <p>
              Room ID: <strong>{room}</strong>
            </p>
            <p>
              Share this Room ID. The game starts automatically when 2 players
              have joined. To play yourself, open Play Quiz and join with this
              Room ID.
            </p>
            <button
              onClick={() => {
                setQuizCreated(false);
                setQuizName("");
                setRoom("");
                setQuestions([]);
              }}
            >
              Create Another
            </button>
          </div>
        ) : (
          <div>
            <input
              className="quizname"
              placeholder="Quiz name"
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
            />
            <input
              placeholder="Room ID"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
            />

            <h3>Add Question</h3>
            <textarea
              placeholder="Question"
              value={currentQuestion.question}
              onChange={(e) =>
                setCurrentQuestion({
                  ...currentQuestion,
                  question: e.target.value,
                })
              }
            />
            {currentQuestion.answers.map((a, i) => (
              <div key={i}>
                <input
                  type="checkbox"
                  checked={a.correct}
                  onChange={() => {
                    setCurrentQuestion({
                      ...currentQuestion,
                      answers: currentQuestion.answers.map((ans, idx) =>
                        idx === i ? { ...ans, correct: !ans.correct } : ans
                      ),
                    });
                  }}
                />
                <input
                  placeholder={`Option ${i + 1}`}
                  value={a.text}
                  onChange={(e) => {
                    setCurrentQuestion({
                      ...currentQuestion,
                      answers: currentQuestion.answers.map((ans, idx) =>
                        idx === i ? { ...ans, text: e.target.value } : ans
                      ),
                    });
                  }}
                />
              </div>
            ))}

            <button onClick={handleAddQuestion}>Add Question</button>
            <button onClick={handleCreateQuiz}>Create Quiz</button>

            <h3>Questions ({questions.length})</h3>
            <ul>
              {questions.map((q, i) => (
                <li key={i}>
                  <strong>Q{i + 1}:</strong> {q.question}
                  <ul>
                    {q.answers.map((a, ai) => (
                      <li
                        key={ai}
                        style={{ fontWeight: a.correct ? "bold" : "normal" }}
                      >
                        {a.text}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <button
              onClick={() => {
                setMode(null);
              }}
            >
              Back
            </button>
          </div>
        )}
      </div>
    );
  }

  // PLAY mode UI ////////////////////////////-------------------------------------------------------------------->
  return (
    <div className="app">
      <ToastContainer />
      <h1>QuizClash 💡</h1>
      {!joined ? (
        <form onSubmit={handleJoinRoom}>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Room ID"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button type="submit">Join</button>
        </form>
      ) : (
        <div>
          <p>
            Room ID: <strong>{room}</strong>
          </p>
          {winner ? (
            <div>
              <h3>
                Game Over! {isTie ? "It's a tie: " : "Winner: "}
                {winner}
              </h3>
              <h3>Final Scores</h3>
              <ul>
                {scores.map((p, i) => (
                  <li key={i} style={{ listStyle: "none" }}>
                    <h4>
                      {p.name}: {p.score}
                    </h4>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  socket.emit("leaveRoom", room, name);
                  resetPlayState();
                  setMode(null);
                }}
              >
                Play Again
              </button>
            </div>
          ) : currentQ ? (
            <div>
              <h4>
                Q {currentQ.questionNumber}/{currentQ.totalQuestions} — Time
                left: {seconds}s
              </h4>
              <h3>{currentQ.question}</h3>
              <ul>
                {currentQ.answers.map((a, i) => {
                  const isCorrect = reveal && reveal.correctIndexes.includes(i);
                  return (
                    <li key={i}>
                      <button
                        onClick={() => handleAnswer(i)}
                        disabled={answered}
                        style={{ background: answered ? "#918c8cff" : "" }}
                      >
                        {a}
                      </button>
                      {reveal && (isCorrect ? <span> ✅</span> : null)}
                    </li>
                  );
                })}
              </ul>

              <div>
                <h4>Scores</h4>
                <ul>
                  {scores.map((p, i) => (
                    <li key={i} style={{ listStyle: "none" }}>
                      <h4>
                        {p.name}: {p.score}
                      </h4>
                    </li>
                  ))}
                </ul>
              </div>

              {reveal ? (
                <div>
                  <h3>Correct answers revealed</h3>
                </div>
              ) : (
              <h3>Waiting for answers...</h3>
              )}
            </div>
          ) : (
            <div>
              <p>Waiting for game to start...</p>
              <ul>
                {scores.map((p, i) => (
                  <li key={i} style={{ listStyle: "none" }}>
                    <h4>
                      {p.name}: {p.score}
                    </h4>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => {
          socket.emit("leaveRoom", room, name);
          resetPlayState();
          setMode(null);
        }}
      >
        Exit
      </button>
    </div>
  );
}
