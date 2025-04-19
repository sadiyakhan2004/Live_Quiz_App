import { useState, useEffect } from "react";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import { v4 as uuidv4 } from "uuid";
import DropDown from "../ui/DropDown";
import { Plus, Minus, AlertCircle } from "lucide-react";
import Tooltip from "../ui/Tooltip";

import {
  updateResponse,
  isAnswerCorrect,
  localResponses
} from "@/controllers/response";

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

interface DropdownItem {
  label: string;
  value: string;
}

interface QuizProps {
  question?: {
    heading?: string;
    paras?: string[];
  };
  correctAns?: string; // Correct answer for the blank
  Qn_id?: string;
  options?: string[]; // Options for the dropdown
  reviewMode?: boolean;
  onAnswered?: () => void;
 
}

const DropDownComponent: React.FC<QuizProps> = ({
  question,
  correctAns,
  Qn_id,
  options,
  reviewMode,
  onAnswered,
 
}) => {

  const dispatch = useAppDispatch();

  // States for form creation mode
  const [newQuestion, setNewQuestion] = useState<Question>({
    heading: "",
    paras: [""],
  });
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [dropdownOptions, setDropdownOptions] = useState<string[]>([""]);

  // States for quiz mode
  const [userAnswer, setUserAnswer] = useState<string | string[]>(); // Array to hold multiple answers

  const [errors, setErrors] = useState({
    questionContent: false, // Combined error for heading/subheading/content
    options: false,
    correctAns: false,
    dropdownMarker: false,
    correctAnsInOptions: false,
  });

  // State for showing error messages
  const [showErrors, setShowErrors] = useState(false);

  // Check if we are in quiz mode
  const isQuizMode = question && correctAns;

  useEffect(() => {
    if (isQuizMode || reviewMode) {
      const res = localResponses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        setUserAnswer(res.userAns);
      }
    }
  }, [Qn_id, isQuizMode, reviewMode, localResponses]);

  // Function to check if any content contains the {field} marker
  const hasDropdownMarker = () => {
    const headingHasField = newQuestion.heading.includes("{dropdown}");
    const parasHasField = newQuestion.paras.some((para) =>
      para.includes("{dropdown}")
    );

    return headingHasField || parasHasField;
  };

  // Function to check if correct answer is included in options
  const isCorrectAnsInOptions = () => {
    return dropdownOptions.some(
      (option) => option.trim() === correctAnswer.trim()
    );
  };

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

  // Handle the change of user input in the blank area (for quiz mode)
  const handleAnswerChange = (value: string) => {
    setUserAnswer(value); // Assuming you're only storing one answer at a time
    if (Qn_id) {
      updateResponse(Qn_id, value); // Update context with the selected value
      onAnswered?.();
    }
  };

  // Handlers for form creation mode (for updating the template, correct answer, and dropdown options)
  const handleCorrectAnswerChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCorrectAnswer(e.target.value);
  };

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...dropdownOptions];
    updatedOptions[index] = value;
    setDropdownOptions(updatedOptions);
  };

  const removeOption = (index: number) => {
    const updatedOptions = [...dropdownOptions];
    updatedOptions.splice(index, 1); // Remove the option at the specified index
    setDropdownOptions(updatedOptions);
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
    const hasOptions = dropdownOptions.some((option) => option.trim() !== "");
    const hasCorrectAns = correctAnswer.trim() !== "";
    const hasDropdown = hasDropdownMarker();
    const correctAnsExists = isCorrectAnsInOptions();

    setErrors({
      questionContent: !hasContent,
      options: !hasOptions,
      correctAns: !hasCorrectAns,
      dropdownMarker: !hasDropdown,
      correctAnsInOptions: !correctAnsExists && hasCorrectAns, // Only show this error if a correct answer is provided
    });

    return (
      hasContent &&
      hasOptions &&
      hasCorrectAns &&
      hasDropdown &&
      (correctAnsExists || !hasCorrectAns)
    );
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
      options: dropdownOptions,
      correctAns: correctAnswer,
      type: "dropdown", // Corrected to checkbox
    };

    dispatch(addQuestion(newQuestionData)); // Add question to context

    // Reset form after submission
    setNewQuestion({ heading: "", paras: [""] });
    setDropdownOptions([""]);

    setCorrectAnswer("");
    setShowErrors(false);

    // Reset errors
    setErrors({
      questionContent: false,
      options: false,
      correctAns: false,
      dropdownMarker: false,
      correctAnsInOptions: false,
    });
  };

  // Function to get the styles for each option
  const getOptionStyle = () => {
    //const Question = questions.find((q) => q.questionId === Qn_id);
    const { status, correctAns, userAns } = isAnswerCorrect(Qn_id);

    if (reviewMode) {
      if (status) {
        return "border-2 border-green-400 text-green-800 rounded-lg";
      } else {
        return "border-2 border-red-400 text-red-800 rounded-lg";
      }
    }

    return "border-2 border-gray-300 rounded-lg text-gray-900"; // Default style
  };

  // Render the question with a visible dropdown for quiz mode
  const renderWithDropdown = (questionTemplate: string) => {
    const parts = questionTemplate.split("{dropdown}");
    if (parts.length === 2) {
      // Convert the options array to objects with label and value
      const dropdownItems: DropdownItem[] = (options || []).map((option) => ({
        label: option,
        value: option,
      }));
      return (
        <div className="text-lg font-semibold text-gray-600  dark:text-gray-100 flex-cols items-center space-x-3 w-full">
          <span>{parts[0]}</span>
          <DropDown
            items={dropdownItems} // Pass the converted options array
            value={Array.isArray(userAnswer) ? userAnswer[0] : userAnswer} // Assuming userAnswer is a string
            onChange={handleAnswerChange} // Correct event handler
            className={` mt-6
              ${getOptionStyle()} 
              ${
                reviewMode
                  ? "opacity-100 cursor-not-allowed pointer-events-none"
                  : ""
              } 
              text-lg
            `}
          />
          <span>{parts[1]}</span>
        </div>
      );
    }
    return <div >{questionTemplate}</div>;
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
      <div className="text-red-500 dark:text-red-400 text-sm flex items-center gap-1 mt-1">
        <AlertCircle size={14} />
        <span>{message}</span>
      </div>
    );
  };

  if (isQuizMode) {
    // Quiz Mode
    return (
      <div className="flex justify-center items-center w-full bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg max-w-3xl border border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="mb-6 w-full">
          {question?.heading && (
            <h3 className="text-2xl text-gray-800 dark:text-gray-100">{renderWithDropdown(question.heading)}</h3>
          )}
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 dark:text-gray-300 mt-2">
              {renderWithDropdown(para)}
            </p>
          ))}
        </div>
      </div>
    );

  }

  // Form Creation Mode
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg w-full max-w-3xl border border-gray-200 dark:border-slate-800 transition-colors duration-300">
      <p className="mb-4 text-amber-500 dark:text-amber-400 font-medium italic">
        {" "}
        Use "{`{dropdown}`}" to mark the dropdown in the question.
      </p>
      <div className="px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-blue-600 rounded-lg mb-6 transition-colors duration-300 shadow-md">
        {/* Heading Input */}
        <div className="mb-6">
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
        <div className="mb-5 w-full">
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
        <ErrorMessage
          show={errors.dropdownMarker && !errors.questionContent && showErrors}
          message="Question must include at least one {dropdown} marker"
        />
      </div>

      {/* Dropdown Options Input */}
      <div className="mb-6 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-amber-400 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-amber-600 dark:text-amber-300 text-base mb-3">
          Specify Options
        </label>
        {dropdownOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-2 mb-3">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                className="flex-1 px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-amber-200 focus:border-amber-300 transition-all duration-300"
                label={`Option ${index + 1}`}
                backgroundColor="bg-white dark:bg-slate-700"
                focusedLabelClassName="text-amber-400 dark:text-amber-400 bg-white dark:bg-transparent"
              />
            </div>
            {index > 0 && (
              <Tooltip title="Remove">
                <Button
                  variant="outline"
                  onClick={() => removeOption(index)}
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
            onClick={() => setDropdownOptions([...dropdownOptions, ""])}
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

      {/* Correct Answer Input */}
      <div className="mb-8 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-green-500 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-green-700 dark:text-green-400 text-base mb-3">
          Specify the Correct Answers
        </label>
        <Input
          type="text"
          value={correctAnswer}
          onChange={handleCorrectAnswerChange}
          className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 dark:focus:border-green-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
          label="Correct Answer"
          focusedLabelClassName="text-green-700 dark:text-green-400 bg-white dark:bg-transparent"
          backgroundColor="bg-white dark:bg-slate-700"
        />

        <ErrorMessage
          show={errors.correctAns && showErrors}
          message="Correct answer is required"
        />
        <ErrorMessage
          show={errors.correctAnsInOptions && showErrors}
          message="Correct answer must be included in the options list"
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

export default DropDownComponent;
