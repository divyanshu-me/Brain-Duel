import express from "express";
import cors from "cors";
import { getAllowedOrigins } from "./utils/getAllowedOrigins.js";

const app = express();

app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// simple root route, useful as a "is it alive?" check
app.get("/", (_, res) => {
  res.send("Brain-Duel server is running");
});

// routes import
import healthRouter from "./routes/health.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

// routes declaration
app.use("/api/v1/health", healthRouter);

// http://localhost:5000/api/v1/health

// these two must stay LAST
app.use(notFound);
app.use(errorHandler);

export { app };
