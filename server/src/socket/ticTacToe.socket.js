// Tic-Tac-Toe real-time logic  (namespace: /ttt)
// This is your original server.js. Matchmaking, move relay and chat work as before.
// Added: rematch (wireRematch) and cleanup of finished users/rooms.
//
// Events the CLIENT sends : request_to_play, playerMoveFromClient, send_message, rematch_request
// Events the SERVER sends : OpponentFound, OpponentNotFound, playerMoveFromServer,
//                           receive_message, opponentLeftMatch, rematch_requested, rematch_start

import { MAX_NAME_LENGTH, TTT_MAX_MESSAGE_LENGTH } from "../constants.js";

// In-memory state. Lost on every restart.
const allUsers = {};
const allRooms = [];

const cleanMessage = (data) => String(data?.message ?? "").trim().slice(0, TTT_MAX_MESSAGE_LENGTH);

// Rematch: both players must ask for it. When the second request arrives the server
// starts a new game and SWAPS the symbols, so whoever was Cross (second to move) is
// now Circle and moves first. The server does not know if the game is really finished,
// the buttons only appear on the client after the result is shown.
const wireRematch = (me, other) => {
  me.socket.on("rematch_request", () => {
    me.wantsRematch = true;

    if (other.wantsRematch) {
      me.wantsRematch = false;
      other.wantsRematch = false;
      [me.playingAs, other.playingAs] = [other.playingAs, me.playingAs];

      me.socket.emit("rematch_start", { playingAs: me.playingAs });
      other.socket.emit("rematch_start", { playingAs: other.playingAs });
    } else {
      other.socket.emit("rematch_requested");
    }
  });
};

const registerTicTacToe = (io) => {
  io.on("connection", (socket) => {
    allUsers[socket.id] = {
      socket: socket,
      online: true,
    };

    socket.on("request_to_play", (data) => {
      const currentUser = allUsers[socket.id];
      if (!currentUser) return;
      currentUser.playerName =
        String(data?.playerName ?? "").trim().slice(0, MAX_NAME_LENGTH) || "Player";

      let opponentPlayer;

      // Matchmaking: first user who is online and not already playing
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

        // Notify both players (the later joiner is circle and moves first)
        currentUser.socket.emit("OpponentFound", {
          opponentName: opponentPlayer.playerName,
          playingAs: "circle",
        });

        opponentPlayer.socket.emit("OpponentFound", {
          opponentName: currentUser.playerName,
          playingAs: "cross",
        });

        // remember symbols so a rematch can swap them
        currentUser.playingAs = "circle";
        opponentPlayer.playingAs = "cross";
        wireRematch(currentUser, opponentPlayer);
        wireRematch(opponentPlayer, currentUser);

        // Handle moves
        // KNOWN ISSUE #2: the server only relays. It never checks whose turn it is,
        // whether the cell is empty, or who won. Each client decides the winner itself.
        currentUser.socket.on("playerMoveFromClient", (data) => {
          opponentPlayer.socket.emit("playerMoveFromServer", data);
        });

        opponentPlayer.socket.on("playerMoveFromClient", (data) => {
          currentUser.socket.emit("playerMoveFromServer", data);
        });

        // Handle chat messages
        currentUser.socket.on("send_message", (data) => {
          const message = cleanMessage(data);
          if (!message) return;
          opponentPlayer.socket.emit("receive_message", {
            sender: currentUser.playerName,
            message,
          });
        });

        opponentPlayer.socket.on("send_message", (data) => {
          const message = cleanMessage(data);
          if (!message) return;
          currentUser.socket.emit("receive_message", {
            sender: opponentPlayer.playerName,
            message,
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

      // Tell the opponent. This also fires after a finished game, the client keeps
      // the real result and only hides the Rematch button.
      const roomIndex = allRooms.findIndex(
        ({ player1, player2 }) => player1.socket.id === socket.id || player2.socket.id === socket.id
      );

      if (roomIndex !== -1) {
        const { player1, player2 } = allRooms[roomIndex];
        const opponent = player1.socket.id === socket.id ? player2 : player1;
        opponent.socket.emit("opponentLeftMatch");
        allRooms.splice(roomIndex, 1); // the room is over, free the memory
      }

      delete allUsers[socket.id]; // and forget this user
    });
  });
};

export { registerTicTacToe };
