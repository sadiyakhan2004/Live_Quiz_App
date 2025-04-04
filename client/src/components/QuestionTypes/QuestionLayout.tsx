"use client";
import React from "react";
import RadioQuiz from "./RadioQuiz";
import CheckboxQuiz from "./CheckboxQuiz";
import ShortAnswerQuiz from "./ShortAnswerQuiz";
import FillInTheBlankComponent from "./FillInTheBlankQuiz";
import DropDownQuiz from "./DropDownQuiz";
import DND from "./DND";


interface QuestionLayoutProps {
  Qn_id?: string;
  type?:
    | "radio"
    | "checkbox"
    | "short-answer"
    | "fill-in-the-blank"
    | "dropdown"
    | "dnd";
  question?: {
    heading?: string;
    subHeadings?: string[];
    paras?: string[];
  };
  options?: string[]; // For radio and checkbox questions.
  correctAns?: string | string[]; // String for radio/short-answer, string[] for checkbox.
  reviewMode?: boolean;
  onAnswered?: () => void;
}

const QuestionLayout: React.FC<QuestionLayoutProps> = ({
  type = "radio",
  question,
  options,
  correctAns,
  Qn_id,
  reviewMode,
  onAnswered,
}) => {
  const renderComponent = () => {
    switch (type) {
      case "radio":
        return (
          <RadioQuiz
            question={question}
            options={options || []}
            correctAns={correctAns as string}
            Qn_id={Qn_id}
            reviewMode={reviewMode}
            onAnswered={onAnswered}
          />
        );
      case "checkbox":
        return (
          <CheckboxQuiz
            question={question}
            options={options || []}
            correctAns={correctAns as string[]}
            Qn_id={Qn_id}
            reviewMode={reviewMode}
            onAnswered={onAnswered}
          />
        );
      case "short-answer":
        return (
          <ShortAnswerQuiz
            question={question}
            correctAns={correctAns as string}
            Qn_id={Qn_id}
            reviewMode={reviewMode}
            onAnswered={onAnswered}
          />
        );
      case "fill-in-the-blank":
        return (
          <FillInTheBlankComponent
            question={question}
            correctAns={correctAns as string}
            Qn_id={Qn_id}
            reviewMode={reviewMode}
            onAnswered={onAnswered}
          />
        );
      case "dropdown":
        return (
          <DropDownQuiz
            question={question}
            correctAns={correctAns as string}
            Qn_id={Qn_id}
            options={options || []}
            reviewMode={reviewMode}
            onAnswered={onAnswered}
          />
        );
      case "dnd":
        return (
          <div>
            <DND
              question={question}
              correctAns={correctAns as string}
              Qn_id={Qn_id}
              options={options || []}
              reviewMode={reviewMode}
              onAnswered={onAnswered}
            />
          </div>
        );
      default:
        return <div className="text-red-500">Invalid question type!</div>;
    }
  };

  return <div>{renderComponent()}</div>;
};

export default QuestionLayout;
