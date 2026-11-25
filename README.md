# Brain-Duel

**Brain-Duel** is a real-time multiplayer gaming application featuring online Tic-Tac-Toe and a room-based quiz game. It is built with React and Vite on the frontend, Node.js and Express on the backend, and Socket.IO for real-time communication. MongoDB stores quizzes so they remain available after a server restart.

## Games

### Tic-Tac-Toe

Play against another person online through automatic matchmaking.

- Real-time moves and board updates.
- Automatic win and draw detection in the client.
- In-game chat that remains available after a match ends.
- Rematches that require both players to agree; player symbols are swapped for the next round.
- Find a new opponent without refreshing the page.
- Opponent-disconnection handling.

### Quiz Clash

Create a quiz and invite another player using a room ID.

- Create quizzes with any number of questions, each with four options and one or more correct answers.
- Join a quiz using its room ID.
- Timed questions, server-side answer checking, and live score updates.
- Automatic winner or tie result when the quiz ends.
- Play the same saved quiz again using its room ID.
- Duplicate room IDs are rejected.

> **Room behaviour:** A Quiz Clash room is identified by a room ID; it is not password-protected and does not have host controls. Creating a quiz does not make the creator a player. The game starts when two players join the room.

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Real-time communication | Socket.IO |
| Database | MongoDB, Mongoose |
| Notifications | React-Toastify, SweetAlert2 |

## How the application works

The React client connects to the backend through Socket.IO. The server separates the two games into dedicated namespaces:

- `/ttt` — Tic-Tac-Toe matchmaking, moves, chat, rematches, and opponent-left events.
- `/quiz` — quiz creation, room joining, timed questions, answer submission, score updates, and results.

MongoDB is used to persist created quizzes. Active game sessions—including connected players, scores, and timers—are maintained in server memory.

### Data persistence and current implementation notes

- **Quizzes:** Saved in MongoDB. They survive backend restarts and are automatically deleted after 90 days.
- **Active games:** Stored in server memory. A backend restart ends active sessions and clears their live state.
- **Accounts:** The application does not currently have user login or account management.
- **Tic-Tac-Toe validation:** Move rules and winner detection are handled by the clients; the server does not independently validate moves.
- **Quiz validation:** Submitted quiz answers are checked on the server.
- **Chat:** Available in Tic-Tac-Toe only.

These are implementation details of the current version, not claims about features that are planned or fully secured.

## Project structure

```text
Brain-Duel-App/
├── package.json                 # Root scripts for setup, development, start, and build
├── render.yaml                  # Render deployment blueprint
├── server/
│   ├── .env                     # Local server environment variables (create this file)
│   └── src/
│       ├── index.js             # Loads environment, creates HTTP server, starts server
│       ├── app.js               # Express configuration, middleware, routes, error handlers
│       ├── constants.js         # Namespaces, quiz rules, timers, points, database name
│       ├── db/
│       │   └── index.js         # MongoDB connection
│       ├── models/
│       │   └── quiz.model.js    # Mongoose schema for saved quizzes
│       ├── socket/
│       │   ├── index.js         # Socket.IO setup and game registration
│       │   ├── ticTacToe.socket.js
│       │   └── quiz.socket.js
│       ├── controllers/
│       │   └── health.controller.js
│       ├── routes/
│       │   └── health.routes.js
│       ├── middlewares/
│       │   └── error.middleware.js
│       └── utils/               # ApiError, ApiResponse, asyncHandler, origin helpers
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx              # Main game menu
        ├── TicTacToe.jsx
        ├── Square/
        │   └── Square.jsx
        ├── QuizClash.jsx
        └── constants.js         # Backend URL from VITE_SOCKET_URL
```

## Getting started

### Prerequisites

- Node.js 18 or newer (Node.js 20 or 22 recommended).
- npm.
- A MongoDB connection string, either from MongoDB Atlas or a local MongoDB installation.

### 1. Configure MongoDB

The backend requires MongoDB because quizzes are persisted in the database. Choose one of the following options.

#### Option A: MongoDB Atlas

1. Create a MongoDB Atlas account and provision a free M0 cluster.
2. In **Database Access**, create a database user and password.
3. In **Network Access**, allow your development IP address. For a Render deployment, configure network access to allow the Render-hosted backend to connect; the original deployment setup uses `0.0.0.0/0` because Render instances may not have a fixed outbound IP. Consider the security implications of broad network access.
4. In **Connect → Drivers**, copy the connection string and replace the username and password placeholders.
5. Add the connection string to `server/.env` as `MONGODB_URI`.

#### Option B: Local MongoDB

Set the following value in `server/.env`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
```

The database name is configured in `server/src/constants.js` as `brain-duel`. You do not need to create a collection manually; it is created when the application first saves a quiz.

### 2. Configure environment variables

Create the required environment files. Do not commit real credentials or secret values to GitHub.

**`server/.env`**

```env
PORT=5000
CORS_ORIGIN=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
```

**`client/.env`**

```env
VITE_SOCKET_URL=http://localhost:5000
```

| File | Variable | Purpose | Default / example |
|---|---|---|---|
| `server/.env` | `PORT` | Backend port | `5000` |
| `server/.env` | `CORS_ORIGIN` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `server/.env` | `MONGODB_URI` | MongoDB connection string | Required |
| `client/.env` | `VITE_SOCKET_URL` | Backend URL used by the browser | `http://localhost:5000` |

Vite embeds `VITE_*` variables at build time. Rebuild and redeploy the frontend after changing `VITE_SOCKET_URL`.

### 3. Install dependencies

From the project root, run:

```bash
npm run setup
```

This root script installs the project dependencies for the root, server, and client.

### 4. Start the application

From the project root, run:

```bash
npm run dev
```

This starts the backend and frontend together. By default:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

To start the two parts separately, use two terminals.

**Terminal 1 — backend**

```bash
cd server
npm install
npm run dev
```

**Terminal 2 — frontend**

```bash
cd client
npm install
npm run dev
```

To verify that the backend is responding, visit `http://localhost:5000/api/v1/health`. It should return a JSON response.

## Testing the games locally

Use two browser windows (or a normal window and an incognito window) to simulate two players.

### Test Tic-Tac-Toe

1. In the first window, select **Play Tic Tac Toe → Play Online** and enter a player name. The game waits for an opponent.
2. Repeat in the second window with a different name. The players should be matched.
3. Play until the game ends. Confirm that the chat remains available after the result.
4. Select **Rematch** in one window. Accept the rematch in the other window. The board resets, symbols are swapped, and the chat is retained.
5. Select **Find New Opponent** to leave the current match without refreshing the page. The other player is notified that their opponent has left.

### Test Quiz Clash

1. In the first window, select **Play QuizClash → Create Quiz**. Enter a quiz name and room ID, add questions with four options each, mark the correct option(s), and create the quiz.
2. In both windows, select **Play QuizClash → Play Quiz**. Enter different player names and the same room ID, then join.
3. The game starts when both players have joined. Answer the timed questions and check the score updates and final result.
4. Select **Play Again** and join the same room ID again to replay the quiz.
5. To verify persistence, stop and restart the backend, then join the same room ID again. The quiz should still be available because it is saved in MongoDB.
6. Try creating another quiz with the same room ID. The application should reject the duplicate room ID.

**Important:** The person who creates a quiz is not automatically one of its players. Two players must join the room for the game to start.

## Testing from a phone on the same Wi-Fi network

To open the application on a phone connected to the same local network:

1. Find your computer's local network IP address (for example, `192.168.1.8`).
2. Set the backend URL in `client/.env`:

   ```env
   VITE_SOCKET_URL=http://192.168.1.8:5000
   ```

3. Add both the local frontend origin and the phone-accessible frontend origin to `server/.env`:

   ```env
   CORS_ORIGIN=http://localhost:5173,http://192.168.1.8:5173
   ```

4. Start the backend and the Vite host process:

   ```bash
   npm run dev --prefix server
   npm run host --prefix client
   ```

5. Open `http://192.168.1.8:5173` on the phone. Replace the example IP with your computer's actual local IP address.

## Deployment

The repository includes a `render.yaml` deployment blueprint for the backend. The frontend can be deployed on Vercel or Netlify.

### 1. Push the project to GitHub

Push the project to your GitHub repository. Check that `.env` files, database credentials, and `node_modules` are excluded by `.gitignore` before pushing.

### 2. Deploy the backend on Render

You can use the Blueprint flow if Render detects the repository's `render.yaml`, or create a Web Service manually with:

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` |

Add these environment variables in Render:

- `MONGODB_URI` — your MongoDB Atlas connection string.
- `CORS_ORIGIN` — your deployed frontend URL. You can set this after deploying the frontend, then redeploy the backend.

Copy the deployed backend URL (for example, `https://your-service.onrender.com`). Free-tier services may spin down after inactivity, so the first request can take longer. Check Render's current plan details for the latest limits.

### 3. Deploy the frontend on Vercel or Netlify

1. Import the same GitHub repository.
2. Set the project root directory to `client` and use the Vite framework preset.
3. Add the environment variable `VITE_SOCKET_URL` with the deployed Render backend URL.
4. Deploy the frontend.
5. Add the deployed frontend URL to the backend's `CORS_ORIGIN` value in Render and redeploy the backend.

### 4. Verify the deployment

Open the deployed frontend on two devices or browser sessions and test both games. Confirm that the frontend is connecting to the deployed backend and that quiz creation and retrieval work with MongoDB.

## Socket.IO event reference

The application uses separate namespaces for each game.

### `/ttt` — Tic-Tac-Toe

| Direction | Events |
|---|---|
| Client → server | `request_to_play { playerName }`, `playerMoveFromClient { state: { id, sign } }`, `send_message { message }` |
| Server → client | `OpponentFound { opponentName, playingAs }`, `OpponentNotFound`, `playerMoveFromServer`, `receive_message { sender, message }`, `opponentLeftMatch` |

### `/quiz` — Quiz Clash

| Direction | Events |
|---|---|
| Client → server | `createQuiz { roomId, quizName, questions }`, `joinRoom (room, name)`, `submitAnswer (room, index)`, `leaveRoom (room, name)` |
| Server → client | `quizCreated`, `quizCreationError`, `quizNotFound`, `message`, `newQuestion`, `scoresUpdate`, `reveal`, `gameOver` |

## License

No license information is specified in this repository. Add a `LICENSE` file before presenting the project as open source for reuse.
