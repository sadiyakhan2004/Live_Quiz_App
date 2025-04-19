// src/store/features/questionSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Question {
  questionId: string;
  currentQn: {
    heading?: string;
    subHeadings?: string[];
    paras?: string[];
  };
  options?: string[];
  correctAns: string[] | string;
  type: "checkbox" | "radio" | "short-answer" | "fill-in-the-blank" | "dropdown" | "dnd";

}

interface QuestionState {
  questions: Question[];
  loading: boolean;
  error: string | null;
}

const initialState: QuestionState = {
  questions: [
    //    {
    //   questionId: "1",
    //   currentQn: {
    //     heading: "What is the capital of France?",
    //     subHeadings: [],
    //     paras: [],
    //   },
    //   options: ["Berlin", "Madrid", "Paris", "Rome"],
    //   correctAns: "Paris",
    //   type: "dropdown",
    // },
  ],
  loading: false,
  error: null,
};

export const questionSlice = createSlice({
  name: 'questions',
  initialState,
  reducers: {
    addQuestion: (state, action: PayloadAction<Question>) => {
      const newQuestion = {
        ...action.payload,
        options: action.payload.options || [], // Ensure options is always an array
        correctAns:
          typeof action.payload.correctAns === "string" ||
          Array.isArray(action.payload.correctAns)
            ? action.payload.correctAns
            : "", // Ensure correctAns is valid

            // Log the new question
      };
    
      state.questions.push(newQuestion);
      console.log([...state.questions]); 
    },
    
    deleteQuestion: (state, action: PayloadAction<string>) => {
      state.questions = state.questions.filter(
        (question) => question.questionId !== action.payload
      );
    },
    updateQuestion: (state, action: PayloadAction<Question>) => {
      const index = state.questions.findIndex(
        (question) => question.questionId === action.payload.questionId
      );
      if (index !== -1) {
        state.questions[index] = action.payload;
      }
    },
    clearQuestions: (state) => {
      state.questions = []; 
    },
  
    reorderQuestions: (state, action: PayloadAction<Question[]>) => {
      state.questions = action.payload;
    },
  },
});

export const { addQuestion, deleteQuestion,reorderQuestions, updateQuestion,clearQuestions } = questionSlice.actions;
export default questionSlice.reducer;