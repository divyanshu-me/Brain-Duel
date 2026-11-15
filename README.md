# Brain-Duel

Real-time multiplayer games built with **React (Vite)**, **Socket.io**, **Node.js** and **Express**.

- **Tic-Tac-Toe**: online matchmaking, live board, live chat (it keeps working after the game ends), winner/draw detection, **Rematch** (both players agree, symbols swap), **Find New Opponent** without refreshing the page, opponent-left handling.
- **Quiz Clash**: create a quiz (any number of questions, 4 options each, one or more correct), share the room ID, players join, a countdown runs each question, answers are checked on the server, live scores, a winner (or a tie) at the end, and the same room ID can be played again.

Notifications use **React-Toastify** (Quiz Clash) and **SweetAlert2** (Tic-Tac-Toe name prompt).

> Accuracy notes for interviews: chat exists only in Tic-Tac-Toe. "Private rooms" in Quiz Clash means a room ID (room code), with no password or host controls, and the quiz creator is not automatically a player: the game starts when 2 players *join* the room. Tic-Tac-Toe move rules are not checked on the server (the clients decide the winner). All game state is in server memory.

## Project structure

```
Brain-Duel-App/
├── package.json          root scripts (setup, dev, start, build)
├── render.yaml           free backend deploy on Render
├── docs/
│   ├── CODE-MAP.md       Study Guide <-> files in this zip (old line numbers -> new)
│   ├── CHANGELOG.md      what changed in version 2 and why
│   └── KNOWN-ISSUES.md   issues fixed in v2 and the ones still open
├── server/               Express + Socket.io  (ES modules, Chai-and-Code layout)
│   ├── .env              PORT, CORS_ORIGIN
│   └── src/
│       ├── index.js          loads env, creates http server, starts it
│       ├── app.js            express app: cors, json, routes, error handlers
│       ├── constants.js      namespaces + quiz rules (timers, points)
│       ├── socket/
│       │   ├── index.js          creates Socket.io, plugs in both games
│       │   ├── ticTacToe.socket.js   namespace /ttt  (was server.js)
│       │   └── quiz.socket.js        namespace /quiz (was server2.js)
│       ├── controllers/health.controller.js
│       ├── routes/health.routes.js
│       ├── middlewares/error.middleware.js
│       └── utils/            ApiError, ApiResponse, asyncHandler, getAllowedOrigins
└── client/               React + Vite
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx, App.jsx     game menu
        ├── TicTacToe.jsx, Square/Square.jsx
        ├── QuizClash.jsx
        └── constants.js          SERVER_URL from VITE_SOCKET_URL
```

## Run it locally

You need **Node.js 18 or newer** (20 or 22 recommended).

```bash
# 1. from the Brain-Duel-App folder, install everything (root + server + client)
npm run setup

# 2. start backend (port 5000) and frontend (port 5173) together
npm run dev
```

Open **http://localhost:5173** in **two browser windows** (or one normal and one incognito window) to play against yourself.

Prefer two terminals?

```bash
cd server && npm install && npm run dev      # terminal 1  -> http://localhost:5000
cd client && npm install && npm run dev      # terminal 2  -> http://localhost:5173
```

Check the backend: open http://localhost:5000/api/v1/health (you should see a JSON response).

### How to test each game

**Tic-Tac-Toe**
1. Window 1: click **Play Tic Tac Toe**, then **Play Online**, enter a name. It shows "Waiting for opponent".
2. Window 2: do the same. Both windows get paired. The second player is Circle and moves first.
3. Play a game and finish it. The chat still works after the result.
4. Click **Rematch** in one window: it shows "Waiting for opponent..." while the other window shows "... wants a rematch!" and **Accept Rematch**. After accepting, the board is cleared, the symbols are swapped (the player who was Cross now plays Circle and moves first) and the chat is kept.
5. Click **Find New Opponent** in one window to leave without refreshing. The other player keeps the result, sees "Your opponent has left the game." and can also click Find New Opponent.

**Quiz Clash**
1. Window 1: click **Play QuizClash**, then **Create Quiz**. Enter a quiz name and a room ID, type a question and its 4 options, tick the correct box(es), click **Add Question**. Add 2 or 3 questions, then click **Create Quiz**.
2. Window 1 and Window 2: click **Play QuizClash**, then **Play Quiz**. Enter different names, the same room ID, and click **Join**.
3. The game starts automatically when 2 players have joined. Answer, watch the scores, the reveal and the final winner (or tie).
   Note: the window that created the quiz is **not** a player. To play with 2 windows, both must click **Play Quiz** and join the room.
4. Click **Play Again** and join the same room ID again to play the quiz once more.

### Play from your phone on the same Wi-Fi
1. Find your computer's local IP (for example `192.168.1.8`).
2. `client/.env`: `VITE_SOCKET_URL=http://192.168.1.8:5000`
3. `server/.env`: `CORS_ORIGIN=http://localhost:5173,http://192.168.1.8:5173`
4. Run `npm run host --prefix client` and `npm run dev --prefix server`, open `http://192.168.1.8:5173` on the phone.

## Environment variables

| File | Variable | Meaning | Default |
|------|----------|---------|---------|
| `server/.env` | `PORT` | backend port | `5000` |
| `server/.env` | `CORS_ORIGIN` | allowed frontend URL(s), comma separated | `http://localhost:5173` |
| `client/.env` | `VITE_SOCKET_URL` | backend URL the browser connects to | `http://localhost:5000` |

Vite reads `VITE_*` variables at **build time**, so rebuild/redeploy the client after changing it.

## Deploy for free

**1. Push to GitHub** (the `.gitignore` files keep `node_modules` and `.env` out).

**2. Backend on Render (free web service)**
- Render dashboard, New, Blueprint, choose your repo (it reads `render.yaml`).
  Or New, Web Service manually with: Root Directory `server`, Build `npm install`, Start `npm start`.
- Add the environment variable `CORS_ORIGIN` = your frontend URL (you get it in step 3, then come back and set it).
- Copy the backend URL, for example `https://brain-duel-server.onrender.com`.
- Free instances sleep after inactivity, so the first request can take around a minute. Free tier limits change, so check Render's current pricing page.

**3. Frontend on Vercel (or Netlify)**
- New Project, import the repo, set **Root Directory** to `client`, framework Vite.
- Environment variable `VITE_SOCKET_URL` = the Render URL from step 2.
- Deploy, then put the Vercel URL into Render's `CORS_ORIGIN` and redeploy the backend.

**4. Test** with two devices using the Vercel URL.

## Socket events (cheat sheet)

Namespace `/ttt`
- client sends: `request_to_play {playerName}`, `playerMoveFromClient {state:{id,sign}}`, `send_message {message}`
- server sends: `OpponentFound {opponentName, playingAs}`, `OpponentNotFound`, `playerMoveFromServer`, `receive_message {sender, message}`, `opponentLeftMatch`

Namespace `/quiz`
- client sends: `createQuiz {roomId, quizName, questions}`, `joinRoom (room, name)`, `submitAnswer (room, index)`, `leaveRoom (room, name)`
- server sends: `quizCreated`, `quizCreationError`, `quizNotFound`, `message`, `newQuestion`, `scoresUpdate`, `reveal`, `gameOver`

## Known limitations
See `docs/KNOWN-ISSUES.md` for what was fixed in version 2 and what is still open on purpose (the Study Guide treats them as practice, and interviewers ask about them).
