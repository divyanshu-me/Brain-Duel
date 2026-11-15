// require('dotenv').config({path: './env'})
import "dotenv/config";

import http from "node:http";
import { app } from "./app.js";
import { initSocket } from "./socket/index.js";

const PORT = process.env.PORT || 5000;

// Socket.io needs the raw http server, so we wrap the express app ourselves
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.log(`Port ${PORT} is already in use. Stop the other process or change PORT in .env`);
  } else {
    console.log("Server error !!! ", err);
  }
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`⚙️ Server is running at port : ${PORT}`);
});
