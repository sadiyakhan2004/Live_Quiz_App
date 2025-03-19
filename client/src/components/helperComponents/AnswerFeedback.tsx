import React, { useState, useEffect } from 'react';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';

interface AnswerFeedbackProps {
  status: boolean;
  correctAns: string[];
}

interface FeedbackMessages {
  success: string[];
  error: string[];
}

const FEEDBACK_MESSAGES: FeedbackMessages = {
  success: [
    "Excellent work! Keep it up! 🌟",
    "You're on fire! 🔥",
    "Outstanding! You've got this! ⭐",
    "Brilliant answer! 💫",
    "You're making great progress! 🚀"
  ],
  error: [
    "Almost there! Try again! 💪",
    "Don't give up - you're learning! 📚",
    "Keep going - mistakes help us grow! 🌱",
    "You've got this - give it another shot! 🎯",
    "Getting closer! Keep practicing! ✨"
  ]
};

const AnswerFeedback: React.FC<AnswerFeedbackProps> = ({ status, correctAns }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const getMessage = () => {
    const messageArray = status ? FEEDBACK_MESSAGES.success : FEEDBACK_MESSAGES.error;
    return messageArray[Math.floor(Math.random() * messageArray.length)];
  };

  useEffect(() => {
    setShowAnimation(true);
    const timer = setTimeout(() => setShowAnimation(false), 1000);
    return () => clearTimeout(timer);
  }, [status]);

  const StatusIcon = status ? Check : X;
  const ExpandIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <div className="flex items-end justify-center mt-8 ">
      <div
        className={`
          w-full max-w-md rounded-lg shadow-md 
          transition-all duration-300 transform
          ${showAnimation ? 'scale-105' : 'scale-100'}
          ${status ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}
        `}
      >
        {/* Header Section */}
        <button
          className="w-full p-4 flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          type="button"
        >
          <div className="flex items-center gap-3">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center
                ${status ? 'bg-green-100' : 'bg-red-100'}`}
            >
              <StatusIcon 
                className={`w-5 h-5 ${status ? 'text-green-600' : 'text-red-600'}`} 
              />
            </div>
            <div className="flex flex-col text-left">
              <span 
                className={`font-medium ${status ? 'text-green-700' : 'text-red-700'}`}
              >
                {status ? 'Excellent!' : 'Not Quite Right'}
              </span>
              <span className="text-sm text-gray-600">{getMessage()}</span>
            </div>
          </div>
          
          <ExpandIcon 
            className={`w-5 h-5 ${status ? 'text-green-600' : 'text-red-600'}`} 
            aria-hidden="true"
          />
        </button>

        {/* Expandable Content Section */}
        <div
          className={`
            overflow-hidden transition-all duration-300
            ${isExpanded ? 'max-h-48' : 'max-h-0'}
          `}
        >
          <div className="p-4 pt-0">
            <div className="text-sm">
              <div className="flex gap-2 items-start">
                <Check className="w-4 h-4 mt-0.5 text-gray-400" />
                <div className="flex flex-col">
                  <span className="font-medium">Correct answer:</span>
                  <span className={status ? 'text-green-600' : 'text-gray-600'}>
                    {Array.isArray(correctAns) ? correctAns.join(", ") : correctAns}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerFeedback;