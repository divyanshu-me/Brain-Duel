import React, { useState, useEffect, useRef } from "react";
import "./TicTacToe.css";
import Square from "./Square/Square";
import { io } from "socket.io-client";
import Swal from "sweetalert2";
import { SERVER_URL, TTT_NAMESPACE } from "./constants";

// A fresh board for every game. (The old shared constant was changed by the moves,
// so a second game started with the first game's moves still on the board.)
const createEmptyBoard = () => [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];

const TicTacToe = () => {
  const [gameState, setGameState] = useState(createEmptyBoard);
  const [currentPlayer, setCurrentPlayer] = useState("circle");
  const [finishedState, setFinishedState] = useState(false);
  const [finishedArrayState, setFinishedArrayState] = useState([]);
  const [playOnline, setPlayOnline] = useState(false);
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState(null);
  const [playingAs, setPlayingAs] = useState(null);

  // After-game states (rematch)
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [rematchRequested, setRematchRequested] = useState(false); // I clicked Rematch
  const [opponentWantsRematch, setOpponentWantsRematch] = useState(false);

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
      setFinishedArrayState([0, 4, 8]);
      return gameState[0][0];
    }

    if (
      gameState[0][2] === gameState[1][1] &&
      gameState[1][1] === gameState[2][0]
    ) {
      setFinishedArrayState([2, 4, 6]);
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

  // Back to a clean slate (board, result, chat, opponent). Does not touch the socket.
  const resetGameState = () => {
    setGameState(createEmptyBoard());
    setCurrentPlayer("circle");
    setFinishedState(false);
    setFinishedArrayState([]);
    setPlayingAs(null);
    setOpponentName(null);
    setOpponentLeft(false);
    setRematchRequested(false);
    setOpponentWantsRematch(false);
    setMessages([]);
  };

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
      // If the game already ended, keep the real result (win / lose / draw).
      setFinishedState((prev) => prev || "opponentLeftMatch");
      setOpponentLeft(true);
    };

    const playerMoveHandler = (data) => {
      const id = data.state.id;
      setGameState((prevState) =>
        prevState.map((row, r) =>
          row.map((cell, c) =>
            r === Math.floor(id / 3) && c === id % 3 ? data.state.sign : cell
          )
        )
      );
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

    const rematchRequestedHandler = () => {
      setOpponentWantsRematch(true);
    };

    const rematchStartHandler = (data) => {
      // New game with the same opponent: empty board, symbols swapped by the server,
      // circle always moves first. The chat is kept.
      setGameState(createEmptyBoard());
      setCurrentPlayer("circle");
      setFinishedState(false);
      setFinishedArrayState([]);
      setPlayingAs(data.playingAs);
      setRematchRequested(false);
      setOpponentWantsRematch(false);
    };

    const connectErrorHandler = () => {
      socket.disconnect();
      setPlayOnline(false);
      resetGameState();
      setSocket(null);
      Swal.fire({
        icon: "error",
        title: "Cannot reach the server",
        text: "Make sure the server is running, then try again.",
      });
    };

    // Register event listeners
    socket.on("opponentLeftMatch", opponentLeftHandler);
    socket.on("playerMoveFromServer", playerMoveHandler);
    socket.on("connect", connectHandler);
    socket.on("OpponentNotFound", opponentNotFoundHandler);
    socket.on("OpponentFound", opponentFoundHandler);
    socket.on("receive_message", messageHandler);
    socket.on("rematch_requested", rematchRequestedHandler);
    socket.on("rematch_start", rematchStartHandler);
    socket.on("connect_error", connectErrorHandler);

    // Clean up event listeners
    return () => {
      socket.off("opponentLeftMatch", opponentLeftHandler);
      socket.off("playerMoveFromServer", playerMoveHandler);
      socket.off("connect", connectHandler);
      socket.off("OpponentNotFound", opponentNotFoundHandler);
      socket.off("OpponentFound", opponentFoundHandler);
      socket.off("receive_message", messageHandler);
      socket.off("rematch_requested", rematchRequestedHandler);
      socket.off("rematch_start", rematchStartHandler);
      socket.off("connect_error", connectErrorHandler);
      // Close the connection when this socket is replaced (Find New Opponent)
      // or when the component unmounts (Back to Menu). The old code left it open.
      socket.disconnect();
    };
  }, [socket]);

  // Open a connection and ask the server for an opponent
  function startSearch(username) {
    const newSocket = io(`${SERVER_URL}${TTT_NAMESPACE}`, {
      autoConnect: true,
    });

    newSocket?.emit("request_to_play", {
      playerName: username,
    });

    setSocket(newSocket);
  }

  async function playOnlineClick() {
    const result = await takePlayerName();
    if (!result.isConfirmed) {
      return;
    }

    const username = result.value;
    setPlayerName(username);
    startSearch(username);
  }

  // Rematch with the same opponent. Both players have to click it,
  // then the server starts the new game for both.
  function requestRematch() {
    socket.emit("rematch_request");
    setRematchRequested(true);
  }

  // Leave this opponent and look for a new one, no page refresh needed.
  // (Setting the new socket closes the old one, see the cleanup of the socket effect.)
  function findNewOpponent() {
    resetGameState(); // opponentName becomes null, so the "Waiting for opponent" screen shows
    startSearch(playerName);
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
      {finishedState && (
        <div className="finished-actions">
          {opponentLeft && finishedState !== "opponentLeftMatch" && (
            <p className="rematch-note">Your opponent has left the game.</p>
          )}
          {!opponentLeft && opponentWantsRematch && !rematchRequested && (
            <p className="rematch-note">{opponentName} wants a rematch!</p>
          )}
          {!opponentLeft && (
            <button
              className="action-btn"
              onClick={requestRematch}
              disabled={rematchRequested}
            >
              {rematchRequested
                ? "Waiting for opponent..."
                : opponentWantsRematch
                ? "Accept Rematch"
                : "Rematch"}
            </button>
          )}
          <button className="action-btn secondary" onClick={findNewOpponent}>
            Find New Opponent
          </button>
        </div>
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
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message..."
                maxLength={500}
                disabled={opponentLeft}
              />
              <button onClick={sendMessage} disabled={opponentLeft}>
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicTacToe;
