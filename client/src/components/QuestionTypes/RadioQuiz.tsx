"use client";
import { useState, useEffect } from "react";
import { useQuestions, QuestionData } from "@/context/QuestionProvider";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import {
  updateResponse,
  isAnswerCorrect,
  responses,
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
  const { questions } = useQuestions();

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
      const res = responses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        setSelectedAnswer(res.userAns);
      }
    }
  }, [Qn_id, isQuizMode, reviewMode, responses]);

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
          ? "border border-2 border-green-600 text-green-800" //  User selected the correct answer
          : "border border-2 border-red-600 text-red-800"; //  User selected the wrong answer
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
      <div className="text-red-500 text-sm flex items-center gap-1 mt-1">
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
            <h3 className="text-2xl text-gray-800">{question.heading}</h3>
          )}
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 mt-2">
              {para}
            </p>
          ))}
        </div>
        <div className="space-y-4">
          {options?.map((option, index) => (
            <div
              key={index}
              className={`flex items-center p-2 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-all duration-300 ${getOptionStyle(
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
                className="h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor={`option-${index}`}
                className="ml-3 text-lg text-gray-800"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
                label="Content"
                rows={1}
              />
              {index > 0 && (
                <Tooltip title="Remove">
                  <Button
                    variant="outline"
                    onClick={() => removeParagraph(index)}
                    className="text-red-500 border border-red-500 rounded-full relative"
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
              className="text-green-600 border border-green-600 rounded-full flex items-center gap-1 mt-2 relative"
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
              type="radio"
              id={`new-correct-${index}`}
              name="newCorrectAnswer"
              value={option}
              onChange={handleNewCorrectAnswerChange}
              className="h-3 w-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 transition-all"
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

export default RadioQuizComponent;
