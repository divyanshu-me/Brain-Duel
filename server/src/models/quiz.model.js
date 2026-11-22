// A saved quiz. Only the quiz itself is stored here.
// The LIVE game (players, scores, timers, status) stays in memory in quiz.socket.js.
import mongoose from "mongoose";
import { MAX_NAME_LENGTH, QUIZ_EXPIRE_DAYS } from "../constants.js";

const answerSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    correct: { type: Boolean, default: false },
  },
  { _id: false } // no extra id for every answer
);

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answers: { type: [answerSchema], required: true },
  },
  { _id: false }
);

const quizSchema = new mongoose.Schema(
  {
    // unique:true makes MongoDB itself reject a second quiz with the same room ID
    roomId: { type: String, required: true, unique: true, trim: true, maxlength: MAX_NAME_LENGTH },
    quizName: { type: String, required: true, trim: true, maxlength: MAX_NAME_LENGTH },
    questions: { type: [questionSchema], required: true },
    creator: { type: String }, // socket id of the creator (still unused, KNOWN ISSUE #10)
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index: MongoDB deletes a quiz automatically this many days after it was created.
// Remove this line if you want quizzes to be kept forever.
quizSchema.index({ createdAt: 1 }, { expireAfterSeconds: QUIZ_EXPIRE_DAYS * 24 * 60 * 60 });

export const Quiz = mongoose.model("Quiz", quizSchema);
