import mongoose, { Schema, models, model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

const testSchema = new Schema(
  {
    // quizId: { 
    //   type: String, 
    //   default: uuidv4, // Assigns a unique quiz ID
    //   unique: true 
    // },
    quizName: { 
      type: String, 
      required: true 
    }, // Stores quiz name
    questions: [
      { type: Schema.Types.ObjectId, ref: "Question" }
    ], // Stores list of questions
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

export const Test = models.Test || model("Test", testSchema);
