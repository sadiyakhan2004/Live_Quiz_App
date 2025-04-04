"use client";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import Tooltip from "../ui/Tooltip";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Plus, Minus, AlertCircle } from "lucide-react";

import {
  updateResponse,
  isAnswerCorrect,
  localResponses,
} from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";
import TextArea from "../ui/Textarea";
import Textarea from "../ui/Textarea";

interface Question {
  heading: string;
  paras: string[];
}

interface Qn_Props {
  Qn_id?: string;
  question?: {
    heading?: string;
    paras?: string[];
  };
  options?: string[];
  correctAns?: string[]; // Correct answers are now an array for multiple correct options.
  reviewMode?: boolean;
  onAnswered?: () => void;
  
}

interface QuestionData {
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

const CheckboxQuizComponent: React.FC<Qn_Props> = ({
  question,
  options,
  correctAns,
  Qn_id,
  reviewMode,
  onAnswered,
 
}) => {
  //const { questions } = useQuestions();
  // State for form creation

  const dispatch = useAppDispatch();

  const [newQuestion, setNewQuestion] = useState<Question>({
    heading: "",
    paras: [""],
  });
  const [newOptions, setNewOptions] = useState<string[]>([""]);
  const [newCorrectAns, setNewCorrectAns] = useState<string[]>([]);

  // State for quiz mode
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);

    // State for validation errors
    const [errors, setErrors] = useState({
      questionContent: false, // Combined error for heading/subheading/content
      options : false,
      correctAns: false,
    });
  
    // State for showing error messages
    const [showErrors, setShowErrors] = useState(false);

  const isQuizMode = question && options && correctAns;

  useEffect(() => {
    if (isQuizMode || reviewMode) {
      const res = localResponses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        setSelectedAnswers(
          Array.isArray(res.userAns) ? res.userAns : [res.userAns]
        );
      }
    }
  }, [Qn_id, isQuizMode, reviewMode, localResponses]);

  
  // Check if at least one field (heading, subheading, or content) has data
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

  // Handlers for quiz mode
  const handleOptionChange = (option: string) => {
    // Toggle the selection of the option
    const updatedAnswers = selectedAnswers.includes(option)
      ? selectedAnswers.filter((ans) => ans !== option)
      : [...selectedAnswers, option];
    setSelectedAnswers(updatedAnswers); // Update local state
    if (Qn_id) {
      updateResponse(Qn_id, updatedAnswers); // Update the context answer
      onAnswered?.();
    }
  };

  // Handlers for form creation mode
  // const handleNewQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   setNewQuestion(e.target.value);
  // };

  const handleNewOptionChange = (value: string, index: number) => {
    const updatedOptions = [...newOptions];
    updatedOptions[index] = value;
    setNewOptions(updatedOptions);
  };

  const addNewOption = () => {
    setNewOptions([...newOptions, ""]);
  };

  const removeNewOption = (index: number) => {
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const handleNewCorrectAnswerChange = (option: string) => {
    if (newCorrectAns.includes(option)) {
      setNewCorrectAns(newCorrectAns.filter((ans) => ans !== option));
    } else {
      setNewCorrectAns([...newCorrectAns, option]);
    }
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
    
    const hasOptions = newOptions.some(option => option.trim() !== "");
    // Check if at least one correct answer is selected
    const hasCorrectAns = newCorrectAns.length > 0;
  
    setErrors({
      questionContent: !hasContent,
      options : !hasOptions,
      correctAns: !hasCorrectAns,
    });
  
    return hasContent && hasCorrectAns && hasOptions;
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
      options: newOptions,
      correctAns: newCorrectAns,
      type: "checkbox", // Corrected to checkbox
    };

    dispatch(addQuestion(newQuestionData)); // Add question to store

    // Reset form after submission
    setNewQuestion({ heading: "", paras: [""] });
    setNewOptions([""]);
    setNewCorrectAns([]);

    setShowErrors(false);

    // Reset errors
    setErrors({
     questionContent: false,
     options : false,
     correctAns: false
   });
  };

  // Function to get the styles for each option
  const getOptionStyle = (option: string) => {
    //const Question = questions.find((q) => q.questionId === Qn_id);
    const { status, correctAns, userAns } = isAnswerCorrect(Qn_id);

    if (reviewMode) {
      if (userAns.includes(option)) {
        return correctAns.includes(option)
          ? "border border-2 border-green-600 text-green-800" // User selected correct option
          : "border border-2 border-red-600 text-red-800"; // User selected wrong option
      }
    }

    return ""; // No styling when not in review mode
  };

  // Error message component
  const ErrorMessage = ({ show, message }: { show: boolean, message: string }) => {
    if (!show) return null;
    return (
      <div className="text-red-500 text-sm flex items-center gap-1 mt-1">
        <AlertCircle size={14} />
        <span>{message}</span>
      </div>
    );
  };


  if (isQuizMode) {
    // Quiz Mode

    return (
      <div className="flex flex-col justify-center items-center w-full max-w-3xl px-3 pt-0">
        <div className="mb-6 w-full">
          {question?.heading && (
            <h3 className="text-2xl text-gray-800">{question.heading}</h3>
          )}
         
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 mt-2">
              {para}
            </p>
          ))}
        </div>
        <div className="space-y-4 w-full">
          {options.map((option, index) => (
            <div
              key={index}
              className={`flex items-center space-x-3 p-2 border-2 border-gray-300 rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50  ${getOptionStyle(
                option
              )}`}
            >
              <input
                type="checkbox"
                id={`option-${index}`}
                name="quizOption"
                value={option}
                onChange={() => handleOptionChange(option)}
                checked={selectedAnswers.includes(option)}
                disabled={reviewMode}
                className="h-5 w-5 text-indigo-600 border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor={`option-${index}`}
                className="text-lg text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Form Creation Mode

  return (
    <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-full max-w-3xl border border-gray-200">
      <div className=" px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300">
        {/* Heading Input */}
        <div className="mb-4">
          <label className="block font-semibold text-gray-800 text-lg">
            Write a Question
          </label>
          <Input
            type="text"
            value={newQuestion.heading}
            onChange={handleHeadingChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
            label="Heading"
          />
        </div>

        {/* Multiple Paragraphs Input */}
        <div className="mb-6 w-full">
         
          {newQuestion.paras.map((para, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <Textarea
                value={para}
                onChange={(e) => handleParaChange(index, e.target.value)}
                className="flex-1 w-full px-6 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                label="Content"
                rows={1}
              />
              {index > 0 && (
                <Tooltip title="Remove">
                  <Button
                    variant="outline"
                    onClick={() => removeParagraph(index)}
                    className="text-red-500 border border-red-500 rounded-full flex-shrink-0"
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
              className="text-green-600 border border-green-600 rounded-full flex items-center gap-1 mt-2"
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

      {/* Options Input */}
      <div className="my-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300">
        <label className="block font-semibold text-gray-800 text-lg mb-2">
          Specify Options
        </label>
        {newOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <Input
              type="text"
              value={option}
              onChange={(e) => handleNewOptionChange(e.target.value, index)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              label={`Option ${index + 1}`}
            />
            {index > 0 && (
              <Tooltip title="Remove">
                <Button
                  variant="outline"
                  onClick={() => removeNewOption(index)}
                  className="text-red-500 border border-red-500 rounded-full flex-shrink-0"
                >
                  <Minus size={20} />
                </Button>
              </Tooltip>
            )}
          </div>
        ))}
        <Tooltip title="Add Option" position="top" className="relative">
          <Button
            variant="outline"
            onClick={addNewOption}
            className="text-green-600 border border-green-600 rounded-full mt-2"
          >
            <Plus size={20} />
          </Button>
        </Tooltip>

        <ErrorMessage 
          show={errors.options && showErrors} 
          message="At least one option is required" 
        />
      </div>

      {/* Correct Answer Selection */}
      <div className="my-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300">
        <label className="block font-semibold text-gray-800 text-lg">
          Tick the Correct Answers
        </label>
        {newOptions.map((option, index) => (
          <div key={index} className="flex items-center mb-3">
            <Input
              type="checkbox"
              id={`new-correct-${index}`}
              name="newCorrectAnswer"
              value={option}
              onChange={() => handleNewCorrectAnswerChange(option)}
              className="h-3 w-3 text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-all"
              label=""
            />
            <label
              htmlFor={`new-correct-${index}`}
              className="ml-3 text-gray-800 font-medium"
            >
              {option}
            </label>
          </div>
        ))}
         <ErrorMessage
          show={errors.correctAns && showErrors}
          message="Correct answer is required"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleSaveQuestion}
          className="px-8 py-3 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg"
        >
          Add Question
        </Button>
      </div>
    </div>
  );
};

export default CheckboxQuizComponent;
