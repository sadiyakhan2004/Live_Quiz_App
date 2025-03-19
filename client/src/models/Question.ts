import mongoose, { Schema, models, model } from "mongoose";

const questionSchema = new Schema({
  questionId: {
    type: String,
    required: true,
    unique: true,
  },
  currentQn: {
    heading: String,
    paras: [String],
  },
  options: [String],
  correctAns: Schema.Types.Mixed, // Can be string or array
  type: { type: String, required: true },
});

export const Question = models.Question || model("Question", questionSchema);
