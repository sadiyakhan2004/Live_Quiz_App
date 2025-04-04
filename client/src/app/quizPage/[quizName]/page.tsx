"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import QuizComponent from "@/components/Quizbuilder/QuizComponent";
import Loader from "@/components/helperComponents/Loader";
import { fetchQuestions } from "@/controllers/questions";

export default function QuizPage() {
  const params = useParams();
  const [quizName, setQuizName] = useState<string>("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    // Get quiz name from URL params
    if (params.quizName) {
      // Decode the URL parameter (it might be encoded)
      const decodedQuizName = decodeURIComponent(params.quizName as string);
      setQuizName(decodedQuizName);
    }
  }, [params]);

  useEffect(() => {
    async function loadQuestions() {
      // Only fetch questions if we have a quiz name
      if (!quizName) return;
      
      try {
        setIsLoading(true);
        setError(null);
        const fetchedQuestions = await fetchQuestions(quizName);
        setQuestions(fetchedQuestions);
      } catch (error) {
        console.error(`Error fetching questions for ${quizName}:`, error);
        setError(`Failed to load questions for "${quizName}"`);
      } finally {
        setIsLoading(false);
      }
    }

    loadQuestions();
  }, [quizName]); // Dependency on quizName to fetch questions when it changes

  if (isLoading) {
    return <Loader />;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  if (questions.length === 0) {
    return <div className="text-center p-8">No questions found for "{quizName}"</div>;
  }

  return (
    <div>
      <QuizComponent 
        isQuiz={true} 
        questions={questions} 
        review_Mode={reviewMode}
        quizName={quizName}
        setReview_Mode={setReviewMode}
      />
    </div>
  );
}