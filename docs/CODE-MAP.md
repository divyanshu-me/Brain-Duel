# Code map: Study Guide <-> this project

Use this file next to the Study Guide. It tells you where every part of the guide lives in the zip and what was changed to make the project runnable.

## 1. Your original files -> files in this zip

| Original (your zip) | In this project | Change |
|---|---|---|
| `src/*` (React) | `client/src/*` | Same files. Version 1 only swapped the two hardcoded server URLs (`client/src/constants.js`). **Version 2 changed `TicTacToe.jsx`, `Square/Square.jsx`, `QuizClash.jsx` (rematch and bug fixes), so their line numbers moved, see section 4.** |
| `server.js` (Tic-Tac-Toe, port 3000) | `server/src/socket/ticTacToe.socket.js` | Same logic and event names, wrapped in `registerTicTacToe(io)`. CommonJS `require` became ES `import/export`. |
| `server2.js` (Quiz, port 5000) | `server/src/socket/quiz.socket.js` | Same logic and event names, wrapped in `registerQuiz(io)`. Timer and score numbers moved to `server/src/constants.js`. |
| `package.json` (server's) | `server/package.json` | Fixed name, scripts, `"type": "module"`, removed nothing that was used. |
| `vite.config.js`, `eslint.config.js` | `client/` | ESLint config unchanged. Vite config adds `port 5173` with `strictPort`. |
| `package-lock.json` | (not included) | It did not match `package.json`. `npm install` creates a correct one. |
| `README.md` | `README.md` | Rewritten so it only claims what the code does. |

## 2. Files that were missing and are now created (Guide section 2.1)

- `client/index.html`, `client/package.json`, `client/public/favicon.svg`
- `.gitignore` (root, server, client), `server/.env`, `server/.env.example`, `client/.env.example`
- `server/src/index.js`, `app.js`, `constants.js` (new entry and app files)
- **Version 3 (MongoDB):** `server/src/db/index.js`, `server/src/models/quiz.model.js`, `MONGODB_URI` in `server/.env`, `.env.example` and `render.yaml`
- Health route (`/` and `/api/v1/health`), error and 404 middleware
- Root `package.json` (`npm run setup`, `npm run dev`), `render.yaml`, `.prettierrc`, `README.md`, `docs/`

## 3. Guide sections and what changed

- **Guide section 1 (how it works)**: still correct. The data structures and flow are the same. Version 2 adds the rematch events (`rematch_request`, `rematch_requested`, `rematch_start`) and `isTie` on `gameOver`.
- **Guide section 4 (run it)**: replaced. You no longer run two servers. One command (`npm run dev`) starts one server on port 5000 and the client on 5173.
- **Guide section 5 (deploy)**: done for you. Environment variables are wired (`VITE_SOCKET_URL`, `CORS_ORIGIN`), `render.yaml` exists, and `/` and `/api/v1/health` work.
- **Guide section 8 (upgrade checklist)**: items 1, 2 and 4 are done (missing files, environment variables, merged servers using namespaces). In version 2, item 3 (the bugs) is mostly done too, see `docs/KNOWN-ISSUES.md`. Items 5 (Tic-Tac-Toe rules on the server), 6 (host / start button) and 7 (README) are partly or fully yours to do.
- **Guide Phase 8 (break and fix)**: most of those exercises are already solved in version 2. Read `docs/CHANGELOG.md` and compare with the original files in your own copy, or revert a fix on purpose and fix it again.

### Where the merged server fits the guide's question "why namespaces?"
One Socket.io server, two namespaces: `/ttt` and `/quiz`. A namespace is a separate channel on the same connection endpoint, each with its own `connection` event, rooms and sockets. The client picks one by connecting to `SERVER_URL + "/ttt"` or `SERVER_URL + "/quiz"`. This lets you deploy one free backend instead of two.

## 4. Line-number map (the Study Guide quotes the ORIGINAL files)

### Client (current files)
- `TicTacToe.jsx`: `checkWinner` guide 29-73 -> **37-83**; winner `useEffect` 75-80 -> **85-90**; `opponentLeftHandler` 106-108 -> **130-134**; `playerMoveHandler` 109-117 -> **136-**; socket creation and `request_to_play` 166-184 -> **`startSearch` 230-240, `playOnlineClick` 242-253**; effect cleanup -> **212-226**; `sendMessage` 186-202 -> **267-**; early returns (`!playOnline`, waiting) 206-222 -> **287-**; chat container -> **390-**.
- New in `TicTacToe.jsx`: `createEmptyBoard` **10**, `resetGameState` **98**, `rematchStartHandler` **177**, `connectErrorHandler` **189**, `requestRematch` **255**, `findNewOpponent` **262**, the Rematch / Find New Opponent buttons **365-**.
- `Square/Square.jsx`: `clickOnSquare` guide 71 -> **57-85** (the guard is line **69**).
- `QuizClash.jsx`: socket effect guide 41-113 -> **42-125**; timer in `newQuestion` guide 75-86 -> **85-96**; `handleAddQuestion` 116 -> **127**; `handleCreateQuiz` 138 -> **149**; `handleJoinRoom` 147-153 -> **162-**; `handleAnswer` 155 -> **190**; create screen 175 -> **210**; play screen 290 -> **329**; Exit button 397 -> **~440**. New: `resetPlayState` **176**.

### Server (restructured in version 1, extended in version 2)
`ticTacToe.socket.js`
- `allUsers`, `allRooms` (guide `server.js:12-13`) -> top of the file
- matchmaking loop (`server.js:27-33`) -> **54-60**
- move relay (`server.js:57-64`) -> **93-100**
- disconnect (`server.js:85-105`) -> **124-144**
- new: `wireRematch` **21**

`quiz.socket.js`
- (line numbers below are for version 3, after the MongoDB change)
- `discardRoom` **37** (new), `startGame` **46**, `askQuestion` **53**, 30 s timer **75**, `revealAndNext` **78**, `revealIfEveryoneAnswered` **111** (new), `endGame` **119**, `validateQuiz` **141** (new)
- `createQuiz` **176** (now `async`, saves with `Quiz.create`), `creator` **198**, `joinRoom` **213** (now `async`, loads with `Quiz.findOne`), `submitAnswer` **285**, `scoresUpdate` **~304**, `leaveRoom` **311**, `disconnect` **327**

Issues still open are tagged in the server code with `KNOWN ISSUE #n`.

## 5. How this follows your Backend-chai pattern

| Your Backend-chai | Here |
|---|---|
| `src/index.js`: `import "dotenv/config"` first, then connect and `app.listen` | `server/src/index.js`: same order. We create an `http` server around the app because Socket.io needs it. |
| `src/app.js`: `cors({origin: process.env.CORS_ORIGIN})`, `express.json({limit:"16kb"})`, routes under `/api/v1/...` | `server/src/app.js`: same, plus a root route and error handlers at the end. |
| `src/constants.js` (`DB_NAME`) | `server/src/constants.js` (namespaces and quiz rules) |
| `utils/ApiError.js`, `ApiResponse.js`, `asyncHandler.js` | Copied unchanged in style. Used by the health controller and the error middleware. |
| `controllers/`, `routes/`, `middlewares/` | Same folders. Only the health endpoint uses them. The real-time logic is in `socket/`. |
| `src/basics` notes file | `server/src/basics` |
| `.prettierrc`, `.prettierignore`, `.gitignore`, `.env` | Same settings and files |
| MongoDB (mongoose) | **Version 3:** `db/index.js` (`connectDB`, then `listen`), `models/quiz.model.js` (`export const Quiz = mongoose.model(...)`), `DB_NAME` in `constants.js`. Only quizzes are saved. |
| JWT, multer, Cloudinary | Not present. Brain-Duel has no login or file upload. |

### Done in version 3: quizzes in MongoDB
`createQuiz` saves with `Quiz.create` (the unique index on `roomId` rejects duplicates) and `joinRoom` loads with `Quiz.findOne` when there is no live room. The live game state stays in memory. No REST route was needed because the socket events already carry the data.

### Natural next step
Add login (`verifyJWT`, a `User` model) and store the creator's user id in `Quiz.creator`, so quizzes belong to users and only the owner can edit or delete them.

## 6. What was and was not verified

- Server logic: every file passes a syntax check, and the real handler code was run against a simulated Socket.io layer with mocked timers (pairing, moves, chat, rematch, cleanup, quiz validation, the reveal-gap race, ties, replaying a room, leave and disconnect).
- Client in a real browser: the actual React components and the actual server game code were run together in Chromium with a simulated network, driving two players through full Tic-Tac-Toe games (win, diagonal highlight, chat after the match, rematch, find new opponent, leaving) and full Quiz Clash games (create, wrong room, join, play, winner, tie, play again). No console errors or warnings.
- Version 3 (MongoDB): every changed file passes a syntax check, and the real `quiz.socket.js` code was run against a simulated Socket.io layer and an in-memory **fake** of mongoose (create, duplicate and simultaneous create, validation before the DB, DB errors on create and join, unknown room, two players joining at the same moment, a player leaving while the DB loads, a "restart" with empty memory, and a full answer and reveal).
- Not done: a real `npm install`, real MongoDB / Atlas, real Socket.io over the network, and the real Vite dev server. There was no network access when this was built. Run `npm run setup` and `npm run dev`, then follow the "How to test each game" steps in the README (steps 5 and 6 test MongoDB).
