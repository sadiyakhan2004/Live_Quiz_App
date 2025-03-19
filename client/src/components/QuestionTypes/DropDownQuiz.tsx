import { useState, useEffect } from "react";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import { useQuestions, QuestionData } from "@/context/QuestionProvider";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import { v4 as uuidv4 } from "uuid";
import DropDown from "../ui/DropDown";
import { Plus, Minus, AlertCircle } from "lucide-react";
import Tooltip from "../ui/Tooltip";

import {
  updateResponse,
  isAnswerCorrect,
  responses,
} from "@/controllers/response";

interface Question {
  heading: string;
  paras: string[];
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
  const { questions } = useQuestions();

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
      const res = responses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        setUserAnswer(res.userAns);
      }
    }
  }, [Qn_id, isQuizMode, reviewMode, responses]);

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
        <div className="text-lg font-semibold text-gray-600 flex-cols items-center space-x-3 w-full">
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
    return <div>{questionTemplate}</div>;
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
      <div className="flex justify-center items-center">
        <div className="mb-6 w-full">
          {question?.heading && (
            <h3 className="text-2xl text-gray-800">{renderWithDropdown(question.heading)}</h3>
          )}
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 mt-2">
              {renderWithDropdown(para)}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // Form Creation Mode
  return (
    <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-full max-w-3xl border border-gray-200">
      <p className="mb-4">
        {" "}
        Use "{`{dropdown}`}" to mark the dropdown in the question.
      </p>
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
            className="w-full px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            label="Heading"
          />
        </div>

        {/* Paragraphs Input */}
        <div className="mb-6">
          {newQuestion.paras.map((para, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <Textarea
                value={para}
                onChange={(e) => handleParaChange(index, e.target.value)}
                className="flex-1 w-full px-6 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
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
              className="text-green-600 border border-green-600 rounded-full flex items-center gap-1 mt-2 flex-shrink-0"
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
      <div className="my-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300">
        <label className="block font-semibold text-gray-800 text-lg mb-2">
          Specify Options
        </label>
        {dropdownOptions.map((option, index) => (
          <div key={index} className="mb-2 flex items-center space-x-2">
            <Input
              type="text"
              value={option}
              onChange={(e) => handleOptionChange(index, e.target.value)}
              className="flex-1 px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300"
              label={`Option ${index + 1}`}
            />
            {index > 0 && (
              <Tooltip title="Remove">
                <Button
                  variant="outline"
                  onClick={() => removeOption(index)}
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
            onClick={() => setDropdownOptions([...dropdownOptions, ""])}
            className="text-green-600 border border-green-600 rounded-full mt-2 flex-shrink-0"
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
      <div className="my-6 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-300">
        <Input
          label="Specify the Correct Answers"
          type="text"
          value={correctAnswer}
          onChange={handleCorrectAnswerChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
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
      <div className="flex justify-center">
        <Button
          onClick={handleSaveQuestion}
          className="px-8 py-3 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition-all shadow-lg flex-shrink-0"
        >
          Add Question
        </Button>
      </div>
    </div>
  );
};

export default DropDownComponent;
