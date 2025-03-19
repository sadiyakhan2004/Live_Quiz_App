import mongoose from "mongoose";
import { Question } from "./Question";
import { Test } from "./Test";

const QuizSchema = new mongoose.Schema({
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" },
    quizCode: { type: String, required: true, unique: true },
    quizName: { type: String, required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }], // Store only question IDs
    timeLimit: { type: Number, required: true },
    waitingTime: { type: Number, default: 5 },
    showAnswers: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  });
  const Quiz = mongoose.models.Quiz || mongoose.model("Quiz", QuizSchema);

  export default Quiz;
