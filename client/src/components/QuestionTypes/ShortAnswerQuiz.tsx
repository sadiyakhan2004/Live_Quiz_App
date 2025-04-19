"use client";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import {
  updateResponse,
  isAnswerCorrect,
  localResponses
} from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";
import Input from "../ui/Input";
import Tooltip from "../ui/Tooltip";
import Button from "../ui/Button";
import { AlertCircle, Minus, Plus } from "lucide-react";
import Textarea from "../ui/Textarea";
interface Question {
  heading: string;
  paras: string[];
}

export interface QuestionData {
  questionId: string;
  currentQn: Question;
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

interface QuizProps {
  question?: {
    heading?: string;
    paras?: string[];
  };
  correctAns?: string; // Correct answer as a single string for short answers.
  Qn_id?: string;
  reviewMode?: boolean;
  onAnswered?: () => void;
}

const ShortAnswerComponent: React.FC<QuizProps> = ({
  question,
  correctAns,
  Qn_id,
  reviewMode,
  onAnswered,
}) => {

  const dispatch = useAppDispatch();

  // State for form creation
  const [newQuestion, setNewQuestion] = useState<Question>({
    heading: "",
    paras: [""],
  });
  const [newCorrectAns, setNewCorrectAns] = useState<string>("");

  // State for quiz mode
  const [userAnswer, setUserAnswer] = useState<string | string[]>([]);

  // State for validation errors
  const [errors, setErrors] = useState({
    questionContent: false, // Combined error for heading/subheading/content
    correctAns: false,
  });

  // State for showing error messages
  const [showErrors, setShowErrors] = useState(false);

  const isQuizMode = question && correctAns;

  useEffect(() => {
    setUserAnswer("");

    if (isQuizMode || reviewMode) {
      const res = localResponses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        setUserAnswer(res.userAns);
      }
    }
  }, [Qn_id, isQuizMode, reviewMode,localResponses]);

  // Check if at least one field (heading or content) has data
  const hasQuestionContent = () => {
    return (
      newQuestion.heading.trim() !== "" ||
      newQuestion.paras.some((para) => para.trim() !== "")
    );
  };

  // Update the question content error status
  const updateQuestionContentError = () => {
    setErrors((prev) => ({ ...prev, questionContent: !hasQuestionContent() }));
  };

  // Handler for quiz mode: Updating user's answer
  const handleAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const answer = e.target.value;
    setUserAnswer(answer); // Update local state for user answer
    if (Qn_id) {
      updateResponse(Qn_id, answer); // Update the context answer
      onAnswered?.();
    }
  };

  // Handlers for form creation mode

  const handleNewCorrectAnsChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setNewCorrectAns(e.target.value);
  };

  // Handlers for question details

  // Handler for heading
  const handleHeadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewQuestion({ ...newQuestion, heading: e.target.value });
  };

  // Handlers for paragraphs
  const handleParaChange = (index: number, value: string) => {
    const updatedParas = [...newQuestion.paras];
    updatedParas[index] = value;
    setNewQuestion({ ...newQuestion, paras: updatedParas });
  };

  const addParagraph = () => {
    setNewQuestion({ ...newQuestion, paras: [...newQuestion.paras, ""] });
  };

  const removeParagraph = (index: number) => {
    const updatedParas = newQuestion.paras.filter((_, i) => i !== index);
    setNewQuestion({ ...newQuestion, paras: updatedParas });
  };

  const validateForm = () => {
    const hasContent = hasQuestionContent();

    const hasCorrectAns = newCorrectAns.trim() !== "";

    setErrors({
      questionContent: !hasContent,
      correctAns: !hasCorrectAns,
    });

    return hasContent && hasCorrectAns;
  };

  // Function to save the new question
  const handleSaveQuestion = () => {
    setShowErrors(true);

    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    const newQuestionData: QuestionData = {
      questionId: uuidv4(),
      currentQn: newQuestion,
      correctAns: newCorrectAns,
      type: "short-answer",
    };

    dispatch(addQuestion(newQuestionData)); // Add question to store

    // Reset form after submission
    setNewQuestion({ heading: "", paras: [""] });
    setNewCorrectAns("");
    setShowErrors(false);

     // Reset errors
     setErrors({
      questionContent: false,
      correctAns: false
    });
  };

  // Function to get the styles for each option
  const getOptionStyle = () => {
    //const Question = questions.find((q) => q.questionId === Qn_id);
    const { status, correctAns, userAns } = isAnswerCorrect(Qn_id);

    if (reviewMode && userAns.length > 0) {
      return status
        ? "border-2 border-green-400 text-green-800 bg-green-50"
        : "border-2 border-red-400 text-red-800 bg-red-50";
    }

    return "border-gray-300"; // Default style when not in review mode
  };

  // Error message component
  const ErrorMessage = ({ show, message }: { show: boolean, message: string }) => {
    if (!show) return null;
    return (
      <div className="text-red-500 dark:text-red-400 text-sm flex items-center gap-1 mt-1">
        <AlertCircle size={14} />
        <span>{message}</span>
      </div>
    );
  };

  if (isQuizMode) {
    // Quiz Mode
    return (
      <div className="flex flex-col justify-center items-center w-full max-w-3xl p-6">
        <div className="mb-6 w-full">
          {question?.heading && (
            <h3 className="text-2xl text-gray-800 dark:text-gray-100">{question.heading}</h3>
          )}
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 dark:text-gray-300 mt-2">
              {para}
            </p>
          ))}
        </div>
        <div className={`w-full `}>
          <Input
            type="text"
            value={userAnswer as string}
            onChange={handleAnswerChange}
            className={`w-full px-4 py-2 border-2 border-gray-300  rounded-lg focus:ring-[0.25] focus:ring-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-300 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 ${getOptionStyle()}`}
            disabled={reviewMode}
            placeholder="Type your answer here..."
            label=""   
          />
        </div>
      </div>
    );
  }

  // Form Creation Mode
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg w-full max-w-3xl border border-gray-200 dark:border-slate-800 transition-colors duration-300">
      <div className="px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-blue-600 rounded-lg mb-6 transition-colors duration-300 shadow-md">
        {/* Heading Input */}
        <div className="mb-4">
          <label className="block font-semibold text-blue-700 dark:text-blue-400 text-base mb-2">
            Write a Question
          </label>
          <Input
            type="text"
            value={newQuestion.heading}
            onChange={handleHeadingChange}
            className="w-full px-4 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
            label="Heading"
            focusedLabelClassName="text-blue-700 dark:text-blue-400"
            backgroundColor="bg-white dark:bg-slate-700"
            labelClassName="bg-white dark:bg-transparent"
          />
        </div>
  
        {/* Paragraphs Input */}
        <div className="mb-6">
          {newQuestion.paras.map((para, index) => (
            <div key={index} className="flex items-center gap-2 mb-3">
              <Textarea
                value={para}
                onChange={(e) => handleParaChange(index, e.target.value)}
                className="flex-1 w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
                label="Content"
                rows={1}
                focusedLabelClassName="text-blue-700 dark:text-blue-400"
                textareaClassName="bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                labelClassName="bg-white dark:bg-transparent"
              />
              {index > 0 && (
                <Tooltip title="Remove">
                  <Button
                    variant="outline"
                    onClick={() => removeParagraph(index)}
                    className="text-red-600 dark:text-red-400 border border-red-400 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md flex-shrink-0 transition-colors duration-300"
                  >
                    <Minus />
                  </Button>
                </Tooltip>
              )}
            </div>
          ))}
          <Tooltip title="Add New Line">
            <Button
              variant="outline"
              onClick={addParagraph}
              className="text-green-600 dark:text-green-400 border border-green-500 dark:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-md flex items-center gap-1 mt-2 transition-colors duration-300"
            >
              <Plus />
            </Button>
          </Tooltip>
        </div>
        <ErrorMessage
          show={errors.questionContent && showErrors}
          message="At least one field must be filled"
        />
      </div>
  
      {/* Correct Answer Input */}
      <div className="mb-6 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-green-500 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-green-700 dark:text-green-400 text-base mb-3">
          Specify the Correct Answers
        </label>
        <Input
          type="text"
          value={newCorrectAns}
          onChange={handleNewCorrectAnsChange}
          className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 dark:focus:border-green-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
          label="Correct Answer"
          focusedLabelClassName="text-green-700 dark:text-green-400 bg-white dark:bg-transparent"
          backgroundColor="bg-white dark:bg-slate-700"    
        />
        <ErrorMessage
          show={errors.correctAns && showErrors}
          message="Correct answer is required"
        />
      </div>
  
      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveQuestion}
          className="px-8 py-3 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Add Question
        </Button>
      </div>
    </div>
  );
};

export default ShortAnswerComponent;
