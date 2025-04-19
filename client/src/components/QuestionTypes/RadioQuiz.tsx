"use client";
import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import {
  updateResponse,
  isAnswerCorrect,
  localResponses,
} from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";
import Input from "../ui/Input";
import Tooltip from "../ui/Tooltip";
import { AlertCircle, Minus, Plus } from "lucide-react";
import Button from "../ui/Button";
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
  options?: string[];
  correctAns?: string;
  Qn_id?: string;
  reviewMode?: boolean;
  onAnswered?: () => void;
}

const RadioQuizComponent: React.FC<QuizProps> = ({
  question,
  options,
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
  const [newOptions, setNewOptions] = useState<string[]>([""]);
  const [newCorrectAns, setNewCorrectAns] = useState<string>("");

  // State for quiz mode
  const [selectedAnswer, setSelectedAnswer] = useState<string | string[]>([]);

  // State for validation errors
  const [errors, setErrors] = useState({
    questionContent: false, // Combined error for heading/subheading/content
    options: false,
    correctAns: false,
  });

  // State for showing error messages
  const [showErrors, setShowErrors] = useState(false);

  const isQuizMode = question && options && correctAns;

  useEffect(() => {
    if (isQuizMode || reviewMode) {
      const res = localResponses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        setSelectedAnswer(res.userAns);
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
  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedValue = e.target.value;
    setSelectedAnswer(selectedValue); // Update selected answer
    if (Qn_id) {
      updateResponse(Qn_id, selectedValue); // Update answer in context
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

  const handleNewCorrectAnswerChange = (
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

  // Validation part
  const validateForm = () => {
    const hasContent = hasQuestionContent();

    const hasOptions = newOptions.some((option) => option.trim() !== "");
    // Check if at least one correct answer is selected
    const hasCorrectAns = newCorrectAns.length > 0;

    setErrors({
      questionContent: !hasContent,
      options: !hasOptions,
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
      type: "radio", // Corrected to checkbox
    };

    dispatch(addQuestion(newQuestionData)); // Add question to store

    // Reset form after submission
    setNewQuestion({ heading: "", paras: [""] });
    setNewOptions([""]);
    setNewCorrectAns("");

    setShowErrors(false);

    // Reset errors
    setErrors({
      questionContent: false,
      options: false,
      correctAns: false,
    });
  };

  const getOptionStyle = (option: string) => {
    //const Question = questions.find((q) => q.questionId === Qn_id);
    const { status, correctAns, userAns } = isAnswerCorrect(Qn_id);

    if (reviewMode) {
      // Check if this option was selected by user (will be first element for radio)
      if (userAns[0] === option) {
        return correctAns[0] === option
          ? "border border-2 border-green-600 dark:border-green-700 text-green-800" //  User selected the correct answer
          : "border border-2 border-red-600 dark:border-red-700 text-red-800"; //  User selected the wrong answer
      }
    }

    return ""; // No styling when not in review mode
  };

  // Error message component
  const ErrorMessage = ({
    show,
    message,
  }: {
    show: boolean;
    message: string;
  }) => {
    if (!show) return null;
    return (
      <div className="text-red-500  dark:text-red-400 text-sm flex items-center gap-1 mt-1">
        <AlertCircle size={14} />
        <span>{message}</span>
      </div>
    );
  };

  if (isQuizMode) {
    // Quiz Mode
    return (
      <div className="w-full max-w-3xl">
        <div className="mb-6 w-full">
          {question?.heading && (
            <h3 className="text-2xl text-gray-800 dark:text-gray-300">{question.heading}</h3>
          )}
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 dark:text-gray-300 mt-2">
              {para}
            </p>
          ))}
        </div>
        <div className="space-y-4">
          {options?.map((option, index) => (
            <div
              key={index}
              className={`flex items-center p-2 border border-gray-400  rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 ${getOptionStyle(
                option
              )}`}
            >
              <input
                type="radio"
                id={`option-${index}`}
                name={`quizOption-${Qn_id}`}
                value={option}
                checked={selectedAnswer === option}
                onChange={handleOptionChange}
                disabled={reviewMode}
                className="custom-radio appearance-none w-5 h-5 bg-white dark:bg-slate-700 border-2 border-gray-600 dark:border-gray-400 rounded-full checked:bg-blue-600 checked:border-blue-600 relative"
              />
              <label
                htmlFor={`option-${index}`}
                className="ml-3 text-lg text-gray-800 dark:text-gray-200"
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
    <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg w-full max-w-3xl border border-gray-200 dark:border-slate-800 transition-colors duration-300">
      {/* Question Section */}
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

        {/* Multiple Paragraphs Input */}
        <div className="mb-6 w-full">
          {newQuestion.paras.map((para, index) => (
            <div key={index} className="flex items-center gap-2 mb-3">
              <Textarea
                value={para}
                onChange={(e) => handleParaChange(index, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
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

          <ErrorMessage
            show={errors.questionContent && showErrors}
            message="At least one field must be filled"
          />
        </div>
      </div>

      {/* Options Input */}
      <div className="mb-6 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-amber-400 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-amber-600 dark:text-amber-300 text-base mb-3">
          Specify Options
        </label>
        {newOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-2 mb-3 w-full">
            <div className="flex-1 relative w-full">
              <Input
                type="text"
                value={option}
                onChange={(e) => handleNewOptionChange(e.target.value, index)}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-amber-200 focus:border-amber-300 transition-all duration-300"
                label={`Option ${index + 1}`}
                backgroundColor="bg-white dark:bg-slate-700"
                focusedLabelClassName="text-amber-400 dark:text-amber-400 bg-white dark:bg-transparent"
              />
            </div>
            {index > 0 && (
              <Tooltip title="Remove">
                <Button
                  variant="outline"
                  onClick={() => removeNewOption(index)}
                  className="text-red-600 dark:text-red-400 border border-red-400 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md flex-shrink-0 transition-colors duration-300"
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
            className="text-green-600 dark:text-green-400 border border-green-500 dark:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-md flex items-center gap-1 mt-2 transition-colors duration-300"
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
      <div className="mb-6 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-green-500 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-green-700 dark:text-green-400 text-base mb-3">
          Tick the Correct Answers
        </label>
        <div className="space-y-2 w-full">
          {newOptions.map((option, index) => (
            <div
              key={index}
              className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md transition-colors w-full"
            >
              <Input
                type="radio"
                id={`new-correct-${index}`}
                name="newCorrectAnswer"
                value={option}
                onChange={handleNewCorrectAnswerChange}
                className="custom-radio appearance-none w-5 h-5 bg-white dark:bg-slate-700 border-2 border-gray-600 dark:border-gray-400 rounded-full checked:bg-green-600 checked:border-green-600 relative"
                label=""
              />
              <label
                htmlFor={`new-correct-${index}`}
                className="ml-3 mb-2 text-gray-800 dark:text-slate-200 font-medium cursor-pointer flex-1"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
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

export default RadioQuizComponent;
