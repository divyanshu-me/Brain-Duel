import React, { useState, useEffect, useRef } from "react";
import "./TicTacToe.css";
import Square from "./Square/Square";
import { io } from "socket.io-client";
import Swal from "sweetalert2";

const renderFrom = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const App = () => {
  const [gameState, setGameState] = useState(renderFrom);
  const [currentPlayer, setCurrentPlayer] = useState("circle");
  const [finishedState, setFinishedState] = useState(false);
  const [finishedArrayState, setFinishedArrayState] = useState([]);
  const [playOnline, setPlayOnline] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState(null);
  const [playingAs, setPlayingAs] = useState(null);

  // Chat states
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef(null);

  const checkWinner = () => {
    // row dynamic
    for (let row = 0; row < gameState.length; row++) {
      if (
        gameState[row][0] === gameState[row][1] &&
        gameState[row][1] === gameState[row][2]
      ) {
        setFinishedArrayState([row * 3 + 0, row * 3 + 1, row * 3 + 2]); // ye just kya hai cross ya circle check pta krne ke liye
        return gameState[row][0];
      }
    }

    // column dynamic
    for (let col = 0; col < gameState.length; col++) {
      if (
        gameState[0][col] === gameState[1][col] &&
        gameState[1][col] === gameState[2][col]
      ) {
        setFinishedArrayState([0 * 3 + col, 1 * 3 + col, 2 * 3 + col]);
        return gameState[0][col];
      }
    }

    if (
      gameState[0][0] === gameState[1][1] &&
      gameState[1][1] === gameState[2][2]
    ) {
      return gameState[0][0];
    }

    if (
      gameState[0][2] === gameState[1][1] &&
      gameState[1][1] === gameState[2][0]
    ) {
      return gameState[0][2];
    }

    const isDrawMatch = gameState.flat().every((e) => {
      if (e === "circle" || e === "cross") return true;
    });

    if (isDrawMatch) return "draw";

    return null;
  };

  useEffect(() => {
    const winner = checkWinner();
    if (winner) {
      setFinishedState(winner);
    }
  }, [gameState]);

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const takePlayerName = async () => {
    const result = await Swal.fire({
      title: "Enter your name",
      input: "text",
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return "You need to write something!";
        }
      },
    });

    return result;
  };

  useEffect(() => {
    if (!socket) return;

    // Socket event handlers
    const opponentLeftHandler = () => {
      setFinishedState("opponentLeftMatch");
    };

    const playerMoveHandler = (data) => {
      const id = data.state.id;
      setGameState((prevState) => {
        let newState = [...prevState];
        const rowIndex = Math.floor(id / 3);
        const colIndex = id % 3;
        newState[rowIndex][colIndex] = data.state.sign;
        return newState;
      });
      setCurrentPlayer(data.state.sign === "circle" ? "cross" : "circle");
    };

    const connectHandler = () => {
      setPlayOnline(true);
    };

    const opponentNotFoundHandler = () => {
      setOpponentName(false);
    };

    const opponentFoundHandler = (data) => {
      setPlayingAs(data.playingAs);
      setOpponentName(data.opponentName);
      setMessages([]); // Clear chat when new opponent found
    };

    const messageHandler = (data) => {
      setMessages((prev) => [
        ...prev,
        {
          sender: data.sender,
          text: data.message,
          isSelf: false,
        },
      ]);
    };

    // Register event listeners
    socket.on("opponentLeftMatch", opponentLeftHandler);
    socket.on("playerMoveFromServer", playerMoveHandler);
    socket.on("connect", connectHandler);
    socket.on("OpponentNotFound", opponentNotFoundHandler);
    socket.on("OpponentFound", opponentFoundHandler);
    socket.on("receive_message", messageHandler);

    // Clean up event listeners
    return () => {
      socket.off("opponentLeftMatch", opponentLeftHandler);
      socket.off("playerMoveFromServer", playerMoveHandler);
      socket.off("connect", connectHandler);
      socket.off("OpponentNotFound", opponentNotFoundHandler);
      socket.off("OpponentFound", opponentFoundHandler);
      socket.off("receive_message", messageHandler);
    };
  }, [socket]);

  async function playOnlineClick() {
    const result = await takePlayerName();
    if (!result.isConfirmed) {
      return;
    }

    const username = result.value;
    setPlayerName(username);

    const newSocket = io("http://localhost:3000", {
      autoConnect: true,
    });

    newSocket?.emit("request_to_play", {
      playerName: username,
    });

    setSocket(newSocket);
  }

  const sendMessage = () => {
    if (messageInput.trim() === "") return;

    socket.emit("send_message", {
      message: messageInput,
    });

    setMessages((prev) => [
      ...prev,
      {
        sender: "You",
        text: messageInput,
        isSelf: true,
      },
    ]);

    setMessageInput("");
  };

  //start condition se pahle ka hai
  if (!playOnline) {
    return (
      <div className="main-div">
        <button onClick={playOnlineClick} className="playOnline">
          Play Online
        </button>
      </div>
    );
  }

  if (playOnline && !opponentName) {
    return (
      <div className="waiting">
        <h2>Waiting for opponent</h2>
      </div>
    );
  }

  return (
    <div className="main-div">
      <div className="move-detection">
        <div
          className={`left ${
            currentPlayer === playingAs ? "current-move-" + currentPlayer : ""
          }`}
        >
          {playerName}
        </div>
        <div
          className={`right ${
            currentPlayer !== playingAs ? "current-move-" + currentPlayer : ""
          }`}
        >
          {opponentName}
        </div>
      </div>
      <div>
        <h2 className="game-heading water-background">Tic Tac Toe</h2>
        <div className="square-wrapper">
          {gameState.map((arr, rowIndex) =>
            arr.map((e, colIndex) => (
              <Square
                key={rowIndex * 3 + colIndex}
                socket={socket}
                playingAs={playingAs}
                gameState={gameState}
                finishedArrayState={finishedArrayState}
                finishedState={finishedState}
                currentPlayer={currentPlayer}
                setCurrentPlayer={setCurrentPlayer}
                setGameState={setGameState}
                id={rowIndex * 3 + colIndex}
                currentElement={e}
              />
            ))
          )}
        </div>
        {finishedState &&
          finishedState !== "opponentLeftMatch" &&
          finishedState !== "draw" && (
            <h3 className="finished-state">
              {finishedState === playingAs ? "You " : finishedState} won the
              game
            </h3>
          )}
        {finishedState &&
          finishedState !== "opponentLeftMatch" &&
          finishedState === "draw" && (
            <h3 className="finished-state">It's a Draw</h3>
          )}
      </div>
      {!finishedState && opponentName && (
        <h2>You are playing against {opponentName}</h2>
      )}
      {finishedState && finishedState === "opponentLeftMatch" && (
        <h2>You won the match, Opponent has left</h2>
      )}
      {/* Chat Container */}
      <div className="chat-container">
        {opponentName && (
          <div className="chat-container">
            <h2>Chat with {opponentName}</h2>
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-message ${msg.isSelf ? "self" : "opponent"}`}
                >
                  <strong>{msg.sender}:</strong> {msg.text}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                disabled={finishedState}
              />
              <button onClick={sendMessage} disabled={finishedState}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
