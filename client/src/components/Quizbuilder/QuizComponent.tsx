"use client";
import React, { useState, useEffect } from "react";
import QuestionLayout from "../QuestionTypes/QuestionLayout";
import AnswerFeedback from "@/components/helperComponents/AnswerFeedback";
import QuizCompletionComponent from "@/components/helperComponents/QuizCompletion"

import { v4 as uuidv4 } from "uuid";
import {
  fetchUserResponses,
  getUnansweredQuestions,
  submitUserResponses,
  ApiResponse,
  isAnswerCorrect,
} from "@/controllers/response";

import {
  FaFileAlt,
  FaSave,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import Button from "@/components/ui/Button";
import { ArrowRight, CheckCircle, XCircle } from "lucide-react";

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


interface QuizPageProps {
  questions : QuestionData[]
  isQuiz?: boolean;
  type?: "checkbox" | "radio" | "short-answer" | "fill-in-the-blank" | any;
  review_Mode?: boolean;
  quizName: string;
  setReview_Mode?: (value: boolean) => void;
}

const QuizComponent: React.FC<QuizPageProps> = ({ type, isQuiz, questions, review_Mode, quizName,setReview_Mode }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ reviewMode, setReviewMode ] = useState(review_Mode);
  const [submitted, setSubmitted] = useState(false); // State to handle submission
  const [showModal, setShowModal] = useState(false); // Modal visibility state
  const [showQuestionList, setShowQuestionList] = useState(false); // State for showing question list
  const [responses, setResponses] = useState<any>([]);
  const [answeredQuestions, setAnsweredQuestions] = useState<string[]>([]);

  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    let storedUserId = localStorage.getItem("userId");

    if (!storedUserId) {
      storedUserId = uuidv4(); // Create new session ID
      localStorage.setItem("userId", storedUserId);
    }

    setUserId(storedUserId);
  }, []);

  // function to track answered questions
  // Update the function to use array
  const updateAnsweredQuestions = (questionId: string) => {
    setAnsweredQuestions((prev) => {
      if (!prev.includes(questionId)) {
        return [...prev, questionId];
      }
      return prev;
    });
  };
  const totalQuestions = questions.length;

  // Handlers for navigation
  const nextQuestion = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const submitAll = async () => {
    const isQuizCompleted = await (async () => {
      const unansweredQuestions = await getUnansweredQuestions(quizName);

      if (unansweredQuestions.length > 0) {
        return false;
      }

      return true;
    })();

    if (!isQuizCompleted) {
      alert("You need to answer all questions!");
      return;
    }

    const submittedResponse = await submitUserResponses(userId, quizName);
    console.log(submittedResponse);
    const userResponses: ApiResponse | null = await fetchUserResponses(
      userId, quizName
    );

    // Ensure responses is an array before setting it
    if (userResponses && Array.isArray(userResponses.responses)) {
      // Access the 'responses' array and set it in state
      setResponses(userResponses);
      console.log("state change");
      console.log(responses);
    } else {
      // Handle case when 'responses' is not an array
      console.error("Invalid response format:", userResponses);
      setResponses([]); // Default to empty array
    }

    setReviewMode?.(true); // Set review mode after submitting all answers
    setSubmitted(true); // Mark as submitted
    setShowModal(true); // Show the modal when quiz is submitted
  };

  const handleReview = () => {
    // Logic to navigate to review screen or do anything you need
    setShowModal(false);
    setCurrentIndex(0);
  };

  const handleCloseReview = () => {
    setShowModal(true);
  };

  const handleQuestionList = () => {
    setShowQuestionList(true); // Show the question list modal
  };

  const handleCloseQuestionList = () => {
    setShowQuestionList(false); // Close the question list modal
  };

    return (
      <div className="bg-gray-200 dark:bg-gray-800 w-full flex flex-col justify-center min-h-screen items-center py-2 m-0">
        {isQuiz && questions && totalQuestions > 0 && (
          <div className="w-full max-w-3xl px-4 sm:px-8 border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-900 h-[95vh]">
            {/* Top Section: Left buttons (Questions & Save) */}
            <div className="flex space-x-4 mb-2 mt-2">
              <button
                className="flex items-center p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                onClick={handleQuestionList}
              >
                <FaFileAlt className="mr-2" />
                Questions
              </button>
            </div>
    
            {/* Current Question Layout */}
            <div className="bg-white dark:bg-gray-800 p-6 py-8 rounded-xl shadow-lg border-2 border-blue-800 dark:border-blue-600 h-[550px] overflow-y-auto w-full">
              <QuestionLayout
                question={questions[currentIndex].currentQn}
                options={questions[currentIndex].options || []}
                correctAns={questions[currentIndex].correctAns}
                type={questions[currentIndex].type || "radio"}
                Qn_id={questions[currentIndex].questionId}
                onAnswered={() =>
                  updateAnsweredQuestions(questions[currentIndex].questionId)
                }
                reviewMode={reviewMode}
              />
    
              {/* Display correct/incorrect feedback */}
              {reviewMode &&
                (() => {
                  const { status, correctAns, userAns } = isAnswerCorrect(
                    questions[currentIndex].questionId
                  );
                  return (
                    <div className="mt-4">
                      <AnswerFeedback
                        status={status}
                        correctAns={
                          Array.isArray(correctAns) ? correctAns : [correctAns]
                        }
                      />
                    </div>
                  );
                })()}
            </div>
    
            {showQuestionList && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 flex justify-center items-center z-50">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-3xl">
                  <h2 className="text-2xl font-semibold text-center mb-4 dark:text-gray-100">
                    Question List
                  </h2>
    
                  <table className="min-w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="py-2 px-4 border-b dark:border-gray-600 text-left dark:text-gray-200">#</th>
                        <th className="py-2 px-4 border-b dark:border-gray-600 text-left dark:text-gray-200">Question</th>
                        <th className="py-2 px-4 border-b dark:border-gray-600 text-left dark:text-gray-200">Status</th>
                        <th className="py-2 px-4 border-b dark:border-gray-600 text-left dark:text-gray-200">Action</th>
                      </tr>
                    </thead>
                    <tbody className="overflow-y-auto">
                      {questions.map((question, index) => {
                        const isAnswered = answeredQuestions.includes(
                          question.questionId
                        );
    
                        return (
                          <tr key={index} className="border-b dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="py-2 px-4 dark:text-gray-300">{index + 1}</td>
                            <td className="py-2 px-4 dark:text-gray-300">Question {index + 1}</td>
                            <td className="py-2 px-4">
                              {isAnswered ? (
                                <span className="text-green-600 dark:text-green-400">
                                  <CheckCircle size={18} className="mr-1" />
                                </span>
                              ) : (
                                <span className="text-red-600 dark:text-red-400">
                                  <XCircle size={18} className="mr-1" />
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-4">
                              <button
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                onClick={() => {
                                  setCurrentIndex(index);
                                  setShowQuestionList(false);
                                }}
                              >
                                <ArrowRight size={16} className="mr-1" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
    
                  <div className="flex justify-center mt-4">
                    <Button variant="secondary" onClick={handleCloseQuestionList}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
    
            {/* Bottom Section: Navigation buttons */}
            <div className="flex justify-between items-center mt-6">
              {!submitted ? (
                <button
                  onClick={submitAll}
                  className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                >
                  Submit All
                </button>
              ) : (
                <Button variant="primary" onClick={handleCloseReview}>
                  Close review
                </Button>
              )}
    
              {/* Modal */}
              {showModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-70 flex justify-center items-center z-50">
                  <QuizCompletionComponent handleReview={handleReview} quizName={quizName} />
                </div>
              )}
    
              {/* Navigation Controls */}
              <div className="flex items-center space-x-4">
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <button
                  onClick={previousQuestion}
                  disabled={currentIndex === 0}
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={nextQuestion}
                  disabled={currentIndex === totalQuestions - 1}
                  className="p-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition disabled:opacity-50"
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export default QuizComponent;

