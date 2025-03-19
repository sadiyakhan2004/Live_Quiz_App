
import { v4 as uuidv4 } from "uuid";


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
    type: "checkbox" | "radio" | "short-answer" | "fill-in-the-blank" | "dropdown" | "dnd";
  }

  export let questions: QuestionData[] = [];
  
  // Fetch questions from the database
 export const fetchQuestions = async (quizName : string): Promise<QuestionData[]> => {
    try {
      const response = await fetch(`/api/questions?quizName=${quizName}`);
        if (!response.ok) throw new Error("Failed to fetch questions");
        const data = await response.json();
        questions = data;
        return data;
      } catch (error) {
        console.error("Error fetching questions:", error);
        return [];
      }
  };

  // Add new questions (bulk insert)
 export const addQuestionInDatabase = async (newQuestions: QuestionData[], quizName : String): Promise<QuestionData[]> => {
   
    try {
        const questions = newQuestions.map(q => ({
          ...q,
          questionId: q.questionId || uuidv4(), // Ensure each question has a unique ID
        }));
  
        const response = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions,quizName }),
        });
  
        if (response.ok) {
          const addedQuestions = await response.json();
          return addedQuestions;
        }
        return [];
      } catch (error) {
        console.error("Error adding new questions:", error);
        return [];
      }
  };

