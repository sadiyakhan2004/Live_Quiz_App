"use client";
import { useState, useEffect } from "react";
import Input from "../ui/Input";
import Textarea from "../ui/Textarea";
import Button from "../ui/Button";
import { useQuestions, QuestionData } from "@/context/QuestionProvider";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import { Plus, Minus, AlertCircle } from "lucide-react";
import Tooltip from "../ui/Tooltip";
import {
  updateResponse,
  isAnswerCorrect,
  responses,
} from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";

interface Question {
  heading: string;
  paras: string[];
}

interface QuizProps {
  question?: {
    heading?: string;
    paras?: string[];
  };
  correctAns?: string; // Correct answer for the blank
  Qn_id?: string;
  reviewMode?: boolean;
  onAnswered?: () => void;
}

const FillInTheBlankComponent: React.FC<QuizProps> = ({
  question,
  correctAns,
  Qn_id,
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

  // States for quiz mode
  const [userAnswer, setUserAnswer] = useState<string[] | string>([""]);

  const [errors, setErrors] = useState({
    questionContent: false, // Combined error for heading/subheading/content
    correctAns: false,
    blankMarker: false,
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

  // Function to check if any content contains the {blank} marker
  const hasBlankMarker = () => {
    const headingHasField = newQuestion.heading.includes("{blank}");
    const parasHasField = newQuestion.paras.some((para) =>
      para.includes("{blank}")
    );

    return headingHasField || parasHasField;
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

  /// Handle the change of user input in the blank area
  const handleAnswerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const answer = e.target.value;
    setUserAnswer(answer);
    if (Qn_id) {
      updateResponse(Qn_id, answer); // Update the context answer
      onAnswered?.();
    }
  };

  // Handlers for form creation mode (for updating the template and correct answer)
  // const handleTemplateChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  //   setTemplate(e.target.value);
  // };

  const handleCorrectAnswerChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCorrectAnswer(e.target.value);
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

  //Validation part
  const validateForm = () => {
    const hasContent = hasQuestionContent();
    const hasCorrectAns = correctAnswer.trim() !== "";
    const hasBlank = hasBlankMarker();

    setErrors({
      questionContent: !hasContent,

      correctAns: !hasCorrectAns,
      blankMarker: !hasBlank,
    });

    return hasContent && hasCorrectAns && hasBlank;
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

      correctAns: correctAnswer,
      type: "fill-in-the-blank", // Corrected to checkbox
    };

    dispatch(addQuestion(newQuestionData)); // Add question to store

    // Reset form after submission
    setNewQuestion({ heading: "", paras: [""] });

    setCorrectAnswer("");
    setShowErrors(false);

    // Reset errors
    setErrors({
      questionContent: false,
      correctAns: false,
      blankMarker: false,
    });
  };

  // Function to get the styles for each option
  const getOptionStyle = () => {
   // const Question = questions.find((q) => q.questionId === Qn_id);
    const { status, correctAns, userAns } = isAnswerCorrect(Qn_id);

    if (reviewMode) {
      if (status) {
        return "border-2 border-green-400 text-green-800";
      } else {
        return "border-2 border-red-400 text-red-800";
      }
    }
    return "border-gray-300"; // Default style when not in review mode
  };

  // Render the question with a visible blank for quiz mode
  const renderWithBlank = (questionTemplate: string) => {
    const questionStr = String(questionTemplate); // Ensure it's a string
    const parts = questionStr.split("{blank}");

    if (parts.length === 2) {
      return (
        <span className="text-gray-600 flex flex-wrap items-center gap-2">
          <span className="whitespace-pre-wrap">{parts[0]}</span>{" "}
          {/* Ensures correct spacing */}
          <input
            type="text"
            value={userAnswer}
            onChange={handleAnswerChange}
            disabled={reviewMode}
            className={`bg-gray-100 text-center h-8 px-2 rounded-sm border border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-300 ${getOptionStyle()}`}
            style={{
              width: `${Math.max(userAnswer.length * 12, 80)}px`,
              display: "inline-block",
              verticalAlign: "middle",
            }}
          />
          <span className="">{parts[1]}</span> {/* Preserves spacing */}
        </span>
      );
    }

    return <span className="text-gray-900">{questionTemplate}</span>;
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
            <h3 className="text-2xl text-gray-800">{renderWithBlank(question.heading)}</h3>
          )}
          {question?.paras?.map((para, i) => (
            <p key={i} className="text-gray-600 mt-2">
              {renderWithBlank(para)}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // Form Creation Mode
  return (
    <div className="bg-white/80 backdrop-blur-lg p-8 rounded-2xl shadow-xl w-full max-w-3xl border border-gray-200">
      <p className="mb-3">
        {" "}
        Use "{`{blank}`}" to mark the blank in the question.
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
          show={errors.blankMarker && !errors.questionContent && showErrors}
          message="Question must include at least one {blank} marker"
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

export default FillInTheBlankComponent;
