"use client";

import React, { useState, useEffect } from 'react';
import { fetchUserResponses } from "@/controllers/response";
import { CheckCircle, XCircle, BarChart3, Award, RefreshCw } from 'lucide-react';

// This should match the exact structure from your API
interface ResponseData {
  questionId: string;
  userAns: string | string[]; // Can be a string or an array for multiple answers
  isCorrect?: boolean;
}

// Import the API response type directly from your controller
import { ApiResponse as ImportedApiResponse } from "@/controllers/response";

interface QuizCompletionProps {
    handleReview: () => void;
    passingPercentage? : number;
    quizName : string;
}

const QuizCompletion: React.FC<QuizCompletionProps> = ({ handleReview , passingPercentage=70, quizName})  => {
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isPassed, setIsPassed] = useState(false);
  const [percentage, setPercentage] = useState(0);
  const [responseItems, setResponseItems] = useState<ResponseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user responses when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const userId = localStorage.getItem("userId");
        
        if (!userId) {
          throw new Error("Session ID not found");
        }
        
        const result = await fetchUserResponses(userId,quizName );
        
        if (!result) {
          throw new Error("No responses found");
        }
        
        if (Array.isArray(result.responses)) {
          setResponseItems(result.responses);
        } else {
          setResponseItems([result.responses as unknown as ResponseData]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch responses");
        console.error("Error fetching responses:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Calculate the score based on correct answers
  useEffect(() => {
    if (responseItems.length > 0) {
      const correctAnswers = responseItems.filter(response => response.isCorrect).length;
      setScore(correctAnswers);
      setTotalQuestions(responseItems.length);
      
      const calculatedPercentage = (correctAnswers / responseItems.length) * 100;
      setPercentage(calculatedPercentage);
      setIsPassed(calculatedPercentage >= passingPercentage);
    }
  }, [responseItems, passingPercentage]);

  if (isLoading) {
    return (
      <div className="w-full max-w-md mx-auto p-6 border rounded-lg bg-white shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4 py-8">
          <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
          <p className="text-lg font-medium text-gray-700">Calculating your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto p-6 border rounded-lg bg-white shadow-lg">
        <div className="flex flex-col items-center justify-center space-y-4 py-6">
          <XCircle className="w-12 h-12 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-800">Unable to Load Results</h3>
          <p className="text-center text-red-500 font-medium">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 border rounded-lg bg-white shadow-lg">
      <div className="text-center mb-6">
        <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <Award className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Quiz Results</h2>
      </div>
      
      <div className="space-y-5 mb-8">
        {/* Result Badge */}
        <div className="flex justify-center mb-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-full ${
            isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <span className="font-semibold text-lg mr-2">
              {isPassed ? 'PASSED!' : 'NOT PASSED'}
            </span>
            {isPassed ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
          </div>
        </div>
        
        {/* Score Card */}
        <div className="bg-gray-50 rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-gray-600 mr-2" />
              <span className="font-medium text-gray-700">Your Score</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-blue-600">{score}</span>
              <span className="text-gray-500 font-medium">/ {totalQuestions}</span>
            </div>
          </div>
          
          {/* Percentage Display */}
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm text-gray-600">Completion</span>
            <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              style={{ width: `${percentage}%` }} 
              className={`h-full rounded-full transition-all duration-500 ${
                isPassed ? 'bg-green-500' : 'bg-red-500'
              }`}>
            </div>
          </div>
          
          {/* Passing Threshold */}
          <div className="mt-2 text-xs text-gray-500 text-right">
            Passing threshold: {passingPercentage}%
          </div>
        </div>
      </div>
      
      {/* Review Button */}
      <div className="mt-8">
        <button
          onClick={handleReview}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center justify-center"
        >
          <span>Review Your Answers</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default QuizCompletion;