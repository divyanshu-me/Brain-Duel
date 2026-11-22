// MongoDB connection (same pattern as your Backend-chai project: connectDB, then start the server)
import mongoose from "mongoose";
import dns from "node:dns";
import { DB_NAME } from "../constants.js";
import { Quiz } from "../models/quiz.model.js";

const connectDB = async () => {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("<password>")) {
    throw new Error(
      "MONGODB_URI is missing or still the placeholder. Set it in server/.env (see README, 'MongoDB setup')."
    );
  }

  // dbName is passed as an option, so the URI can be any normal Atlas or local string
  const connection = await mongoose.connect(uri, {
    dbName: DB_NAME,
    serverSelectionTimeoutMS: 10000, // fail fast (10 s) if the database cannot be reached
  });

  // Build the unique roomId index before accepting players, so duplicate room IDs are always rejected
  await Quiz.init();

  console.log(`🍃 MongoDB connected: ${connection.connection.host} / ${DB_NAME}`);
};

export { connectDB };
