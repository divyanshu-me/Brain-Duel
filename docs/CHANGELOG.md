# Changelog

## Version 3 (quizzes saved in MongoDB)

**What changed:** a quiz is now saved in MongoDB, so it survives a server restart. The live game (players, scores, timers) is still in memory.

- New: `server/src/db/index.js` (`connectDB`), `server/src/models/quiz.model.js` (`Quiz` schema), `DB_NAME` and `QUIZ_EXPIRE_DAYS` in `constants.js`.
- `index.js`: connects to MongoDB first, then starts listening. If `MONGODB_URI` is missing or is still the placeholder, the server prints a clear message and stops.
- `quiz.socket.js`: `createQuiz` saves with `Quiz.create`. A duplicate room ID is rejected by the unique index on `roomId`. `joinRoom` loads the quiz with `Quiz.findOne` when there is no live room. Both handlers are `async` and handle database errors without crashing.
- `joinRoom` checks again after the database call that the player is still connected and that another player has not already created the live room (two players joining at the same moment).
- Only new dependency: `mongoose`. No new client code, no new events, no new routes. The events and their names are the same as version 2.
- `MONGODB_URI` added to `server/.env`, `server/.env.example` and `render.yaml`. README has a "MongoDB setup" section.
- Saved quizzes are deleted automatically 90 days after creation (TTL index). Change `QUIZ_EXPIRE_DAYS` or delete that one line in the model to change this.

## Version 2 (after your first test)

You reported four things. All four are fixed.

**1. "I have to refresh the website to start the next game"**
- New **Find New Opponent** button after a match. It closes the old connection, resets the screen and joins the waiting queue again (`TicTacToe.jsx`, `findNewOpponent`).
- Back to Menu and Find New Opponent now close the old socket (the effect cleanup). Before, the old connection stayed open.

**2. "The chat turns off when the match ends"**
- The input and Send button were disabled when `finishedState` was set (original code). They are now only disabled if the opponent has left.

**3. "There is no option of rematch"**
- New **Rematch** flow. Client sends `rematch_request`. The server tells the other player (`rematch_requested`). When both asked, the server sends `rematch_start` with swapped symbols (`ticTacToe.socket.js`, `wireRematch`).
- The board is a fresh array for every game (`createEmptyBoard`). The old shared starting board was changed by every move, so a second game started dirty.
- `Square.jsx` no longer keeps a local `icon`. It draws from the board only, which also fixed overwriting the opponent's square.

**4. "Opponent joined, how can he start choosing options?" (Quiz Clash)**
- Nothing was broken. The creator is not a player. The game starts when **2 players join** the room. The "Quiz Created!" screen now says so.

### Other fixes made in the same pass
See "Fixed in version 2" in `docs/KNOWN-ISSUES.md`. In short: opponent-left no longer overwrites the result, diagonal win highlight, reveal-gap race, ties, server-side quiz validation, replay of a finished room, "Play Again" leaves a clean screen, wrong room ID returns to the join form, room IDs are trimmed, state is no longer mutated, small React warnings removed, and a message appears if the server cannot be reached.

### Server events added
- `/ttt`: client sends `rematch_request`; server sends `rematch_requested` and `rematch_start {playingAs}`.
- `/quiz`: `gameOver` now also carries `isTie`.
