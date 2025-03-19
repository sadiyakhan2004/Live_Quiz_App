import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // User ID (generated using uuid)
  quizName : { type: String, required: true }, // Test ID (generated using uuid)
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Test" }, // Test ID (generated using uuid)
  quizCode : { type: String }, // Test ID (generated using uuid)
  username : { type: String }, // User's name
  userEmail : { type: String }, // User's email
  responses: [
    {
      questionId: { type: String, required: true }, // Reference to Question collection
      userAns: { type: mongoose.Schema.Types.Mixed, required: true }, // User's answer (string or array)
      isCorrect : {
        type : Boolean,
        // required : true
      }
    },
  ],
      // Time information
      startedAt: {
        type: Date,
        default: Date.now
      },
      completedAt: {
        type: Date
      },
      
      // Performance data
      score: {
        type: Number,
        default: 0
      },
      totalQuestions: {
        type: Number,
        required: true
      },
      correctAnswers: {
        type: Number,
        default: 0
      }
});

export const Response = mongoose.models.Response || mongoose.model('Response', responseSchema);
