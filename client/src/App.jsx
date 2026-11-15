// src/App.js
import React, { useState } from 'react';
import TicTacToe from './TicTacToe';
import QuizClash from './QuizClash';
import './App.css';

function App() {
  const [activeGame, setActiveGame] = useState(null);

  const handleGameSelect = (game) => {
    if (activeGame === null) {
      setActiveGame(game);
    }
  };

  const handleBackToMenu = () => {
    setActiveGame(null);
  };

  return (
    <div className="app-container">
      {!activeGame ? (
        <div className="game-selector">
          <h1>Select a Game</h1>
          <div className="game-buttons">
            <button
              className="game-btn tic-tac-toe-btn"
              onClick={() => handleGameSelect('tic-tac-toe')}
            >
              Play Tic Tac Toe
            </button>
            <button
              className="game-btn quiz-clash-btn"
              onClick={() => handleGameSelect('quiz-clash')}
            >
              Play QuizClash
            </button>
          </div>
        </div>
      ) : (
        <div className="game-container">
          <button className="back-btn" onClick={handleBackToMenu}>
            Back to Menu
          </button>

          {activeGame === 'tic-tac-toe' && <TicTacToe />}
          {activeGame === 'quiz-clash' && <QuizClash />}
        </div>
      )}
    </div>
  );
}

export default App;
