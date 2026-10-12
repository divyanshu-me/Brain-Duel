import React, { useState, useEffect, useRef } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import io from "socket.io-client";
import "./QuizClash.css";

// change URL if your server runs elsewhere
const SOCKET_URL = "http://localhost:5000";
const socket = io(SOCKET_URL, { autoConnect: false });

export default function App() {
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
      toast.error("Quiz not found for this room ID", {
        position: "top-center",
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

    socket.emit("createQuiz", { roomId: room, quizName, questions });
  }

  // PLAY: join room
  function handleJoinRoom(e) {
    e.preventDefault();
    if (!name.trim() || !room.trim())
      return toast.error("Enter name and room id");
    socket.emit("joinRoom", room, name);
    setJoined(true);
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
            <button
              onClick={() => {
                setQuizCreated(false);
                setQuizName("");
                setRoom("");
                setQuestions([]);
                setMode(null);
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
                    const newAnswers = [...currentQuestion.answers];
                    newAnswers[i].correct = !newAnswers[i].correct;
                    setCurrentQuestion({
                      ...currentQuestion,
                      answers: newAnswers,
                    });
                  }}
                />
                <input
                  placeholder={`Option ${i + 1}`}
                  value={a.text}
                  onChange={(e) => {
                    const newAnswers = [...currentQuestion.answers];
                    newAnswers[i].text = e.target.value;
                    setCurrentQuestion({
                      ...currentQuestion,
                      answers: newAnswers,
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
              <h3>Game Over! Winner: {winner}</h3>
              <h3>Final Scores</h3>
              <ul>
                {scores.map((p, i) => (
                  <h4 key={i}>
                    {p.name}: {p.score}
                  </h4>
                ))}
              </ul>
              <button
                onClick={() => {
                  setMode(null);
                  setWinner(null);
                  setJoined(false);
                  setName("");
                  setRoom("");
                  setScores([]);
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
                    <h4 key={i}>
                      {p.name}: {p.score}
                    </h4>
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
                  <h4 key={i}>
                    {p.name}: {p.score}
                  </h4>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => {
          socket.emit("leaveRoom", room, name);
          setMode(null);
          setJoined(false);
          setName("");
          setRoom("");
        }}
      >
        Exit
      </button>
    </div>
  );
}
