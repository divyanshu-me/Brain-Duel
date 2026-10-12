const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", // Ensure this matches your frontend URL
    methods: ["GET", "POST"],
  },
});

const allUsers = {};
const allRooms = [];

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true,
  };

  socket.on("request_to_play", (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;

    let opponentPlayer;

    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      // Mark both as playing
      currentUser.playing = true;
      opponentPlayer.playing = true;

      // Create room
      allRooms.push({
        player1: opponentPlayer,
        player2: currentUser,
      });

      // Notify both players
      currentUser.socket.emit("OpponentFound", {
        opponentName: opponentPlayer.playerName,
        playingAs: "circle",
      });

      opponentPlayer.socket.emit("OpponentFound", {
        opponentName: currentUser.playerName,
        playingAs: "cross",
      });

      // Handle moves
      currentUser.socket.on("playerMoveFromClient", (data) => {
        opponentPlayer.socket.emit("playerMoveFromServer", data);
      });

      opponentPlayer.socket.on("playerMoveFromClient", (data) => {
        currentUser.socket.emit("playerMoveFromServer", data);
      });

      // Handle chat messages
      currentUser.socket.on("send_message", (data) => {
        opponentPlayer.socket.emit("receive_message", {
          sender: currentUser.playerName,
          message: data.message,
        });
      });

      opponentPlayer.socket.on("send_message", (data) => {
        currentUser.socket.emit("receive_message", {
          sender: opponentPlayer.playerName,
          message: data.message,
        });
      });
    } else {
      currentUser.socket.emit("OpponentNotFound");
    }
  });

  socket.on("disconnect", () => {
    const currentUser = allUsers[socket.id];
    if (!currentUser) return;

    currentUser.online = false;
    currentUser.playing = false;

    for (let index = 0; index < allRooms.length; index++) {
      const { player1, player2 } = allRooms[index];

      if (player1.socket.id === socket.id && player2?.socket) {
        player2.socket.emit("opponentLeftMatch");
        break;
      }

      if (player2.socket.id === socket.id && player1?.socket) {
        player1.socket.emit("opponentLeftMatch");
        break;
      }
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
