# Known issues

The 14 issues come from the Study Guide (section 2.3). Version 2 fixed most of them. Client line numbers below are for the **current** files; see `docs/CODE-MAP.md` for the old-to-new mapping.

## Fixed in version 2

1. **Overwriting the opponent's square** (`Square.jsx:69`). The click guard now checks that the cell still holds its starting number instead of the old local `icon` state.
3. **"Opponent has left" overwrote the result** (`TicTacToe.jsx:130`). The real win/lose/draw result is kept; the screen only adds "Your opponent has left the game." and hides Rematch.
4. **Tic-Tac-Toe socket never closed** (`TicTacToe.jsx:225`, the cleanup of the socket effect). Back to Menu and Find New Opponent now close the old connection.
5. **Server memory never cleaned** (`ticTacToe.socket.js` disconnect handler). The finished room and the user are removed.
6. **Reveal-gap race** (`quiz.socket.js`, `revealAndNext`). A room now has a `revealing` status that rejects answers and ignores a second reveal. The next-question timer is stored and cleared.
7. **Optimistic join screen** (`QuizClash.jsx:63`, `quiz.socket.js` `joinRoom`). A wrong room ID returns to the join form, and the socket only joins a room after the quiz is found.
8. **Diagonal wins not highlighted** (`TicTacToe.jsx`, `checkWinner`).
9. **Quiz ties**. Everyone with the top score is listed and the screen says "It's a tie".
11. **Weak server validation** (`quiz.socket.js`, `validateQuiz`). The server checks answer count, empty text, at least one correct answer, and length limits. Chat and player names are length-limited too.
14. **Code quality (partly)**: state mutation removed (`Square.jsx`, `TicTacToe.jsx`, create-quiz form), components renamed `TicTacToe` and `QuizClash`, `<h4>` inside `<ul>` fixed, `onKeyPress` replaced by `onKeyDown`, SVG attributes in camelCase, an error message when the server cannot be reached.

Also fixed while testing:
- A new Tic-Tac-Toe game used to start with the previous game's moves on the board (the shared starting board was changed by every move).
- After "Play Again" in Quiz Clash, the old question and result were still in the state.
- A finished quiz room could not be replayed for 30 seconds, and its old cleanup timer could delete a new game with the same room ID.
- If the last unanswered player left a quiz, the others waited for the 30 s timer.
- Room IDs with spaces (for example `12 `) did not match `12`.
- "Create Another" went back to the menu instead of an empty create form.

## Fixed in version 3

- **Quizzes lost on every restart.** Quizzes are saved in MongoDB (`models/quiz.model.js`). A unique index on `roomId` rejects duplicate room IDs, and a TTL index deletes a quiz 90 days after it was created.

## Still open (on purpose)

2. **Server trusts the client in Tic-Tac-Toe** (`ticTacToe.socket.js`, move relay). No turn, empty-cell or winner check on the server. Fix idea: keep the board and turn on the server, validate each move, send the result.
10. **No host in Quiz Clash**. `creator` is stored but unused, the game auto-starts at 2 players, anyone can join mid-game, and the creator is not a player.
12. **Two independent 30 s timers** (`QuizClash.jsx:85-96` client, `quiz.socket.js:73` server). Fix idea: the server sends an `endsAt` timestamp.
13. **Score leak** (`quiz.socket.js`, `scoresUpdate`). Scores update when someone answers, so others can tell who was correct before the reveal.
14. (rest) The Exit button is on every play screen of Quiz Clash, and `eslint` may report `react-hooks/exhaustive-deps` warnings.

Other limits: the **live game state** is in server memory (a game in progress is lost on restart, one server only), no reconnection, no authentication. Saved quizzes are in MongoDB since version 3, so they are no longer lost on restart.
