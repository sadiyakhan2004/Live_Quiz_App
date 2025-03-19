"use client";

import { useState, useEffect } from "react";
import QuizComponent from "@/components/Quizbuilder/QuizComponent";
import { useQuestions } from "@/context/QuestionProvider";
import { v4 as uuidv4 } from "uuid";
import Loader from "@/components/helperComponents/Loader";
import { fetchQuestions, addQuestionInDatabase } from "@/controllers/questions";

export default function QuizPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQuestions() {
      try {
        setIsLoading(true);
        const fetchedQuestions = await fetchQuestions("python quiz");
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error("Error fetching questions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, []);

  console.log(questions);

  if (isLoading) {
    return <Loader />;
  }

  if (questions.length === 0) {
    return <div>No questions found</div>;
  }

  return (
    <div>
      <QuizComponent 
        isQuiz={true} 
        questions={questions} 
        review_Mode={false}
        quizName={"python quiz"}
      />
    </div>
  );
}