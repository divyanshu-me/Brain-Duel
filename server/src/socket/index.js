import { Server } from "socket.io";
import { NAMESPACES } from "../constants.js";
import { getAllowedOrigins } from "../utils/getAllowedOrigins.js";
import { registerTicTacToe } from "./ticTacToe.socket.js";
import { registerQuiz } from "./quiz.socket.js";

// One Socket.io server, two namespaces:
//   /ttt  -> Tic-Tac-Toe   (was server.js,  port 3000)
//   /quiz -> Quiz Clash    (was server2.js, port 5000)
const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
    },
  });

  registerTicTacToe(io.of(NAMESPACES.TIC_TAC_TOE));
  registerQuiz(io.of(NAMESPACES.QUIZ));

  return io;
};

export { initSocket };
