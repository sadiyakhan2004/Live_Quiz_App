"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { fetchQuestions, addQuestionInDatabase } from "@/controllers/questions";

interface CurrentQn {
  heading?: string;
  paras?: string[];
}

// Define the structure for each question's data
export interface QuestionData {
  questionId: string;
  currentQn: CurrentQn;
  options?: string[];
  correctAns: string | string[];
  type:
    | "checkbox"
    | "radio"
    | "short-answer"
    | "fill-in-the-blank"
    | "dropdown"
    | "dnd";
}

// Context properties interface
interface QuestionContextProps {
  reviewMode: boolean;
  questions: QuestionData[];

  addQuestionToDatabase: (newQuestions: QuestionData[], quizName : String) => void;
  setReviewMode: (mode: boolean) => void;
  setQuestions: React.Dispatch<React.SetStateAction<QuestionData[]>>;
}

// Create the context
const QuestionContext = createContext<QuestionContextProps | undefined>(
  undefined
);

// Provider component
export const QuestionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [databaseResponses, setDatabaseResponses] = useState<any>([]);
  const [reviewMode, setReviewMode] = useState(false);

  // Add new questions (bulk insert)
  const addQuestionToDatabase = async (newQuestions: QuestionData[], quizName : String) => {
    const addedQuestions = await addQuestionInDatabase(newQuestions, quizName);
    if (addedQuestions.length > 0) {
      setQuestions(prev => [...prev, ...addedQuestions]);
    }
  };

  // // Fetch questions on mount
  // useEffect(() => {
  //   const loadQuestions = async () => {
  //     const data = await fetchQuestions();
  //     setQuestions(data);
  //   };

  //   loadQuestions();
  // }, []);

  return (
    <QuestionContext.Provider
      value={{ questions ,addQuestionToDatabase, reviewMode, setReviewMode, setQuestions }}
    >
      {children}
    </QuestionContext.Provider>
  );
};

// Custom hook
export const useQuestions = () => {
  const context = useContext(QuestionContext);
  if (!context) {
    throw new Error("useQuestions must be used within a QuestionProvider");
  }
  return context;
};
