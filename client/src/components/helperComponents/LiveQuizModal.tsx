import React, { useState, useEffect } from "react";
import { X, Copy, Check, Clock } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { saveQuiz } from "@/controllers/quiz";

interface LiveQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: {
    _id: string;
    quizName: string;
    questions: any[];
  };
}

const LiveQuizModal: React.FC<LiveQuizModalProps> = ({ isOpen, onClose, quiz }) => {
  const [quizCode, setQuizCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [timeLimit, setTimeLimit] = useState("30");
  const [showAnswers, setShowAnswers] = useState(false);
  const [quizDuration, setQuizDuration] = useState("10");
  // Track if the quiz duration has been manually set by the user
  const [durationManuallySet, setDurationManuallySet] = useState(false);
  
  // Generate a random code ONLY when the modal first opens
  useEffect(() => {
    if (isOpen && !quizCode) {
      const generateCode = () => {
        return uuidv4();
      };
      
      setQuizCode(generateCode());
      setCopied(false);
      
      // Calculate initial quiz duration only when first opening the modal
      const questionCount = quiz.questions?.length || 0;
      const defaultDuration = Math.max(10, questionCount * parseInt(timeLimit || "30") / 60);
      setQuizDuration(Math.ceil(defaultDuration).toString());
      setDurationManuallySet(false); // Reset the manual flag when opening the modal
    }
  }, [isOpen]);

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(quizCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTimeLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure the input is a positive number
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setTimeLimit(value);
      
      // Only update quiz duration if the user hasn't manually set it
      if (!durationManuallySet && value) {
        const questionCount = quiz.questions?.length || 0;
        const newDuration = Math.max(10, questionCount * parseInt(value) / 60);
        setQuizDuration(Math.ceil(newDuration).toString());
      }
    }
  };
  
  const handleQuizDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure the input is a positive number
    const value = e.target.value;
    if (value === "" || /^\d+$/.test(value)) {
      setQuizDuration(value);
      setDurationManuallySet(true); // Mark that the user has manually set the duration
    }
  };
  
  const startQuiz = async () => {
    try {
      const result = await saveQuiz(
        quiz.quizName,
        quiz._id,
        quizCode,
        quiz.questions, // Assuming questions have _id property
        parseInt(timeLimit),
        parseInt(quizDuration),
        showAnswers
      );
      
      if (result) {
        // Redirect after successful insertion/update
        window.location.href = `/quiz/${quizCode}`;
      } else {
        console.error("Failed to start quiz");
      }
    } catch (error) {
      console.error("Error starting quiz:", error);
    }
  };

  // Calculate estimated quiz duration
  const estimatedDuration = () => {
    const questionCount = quiz.questions?.length || 0;
    const timeLimitNum = parseInt(timeLimit || "30");
    const totalSeconds = questionCount * timeLimitNum;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 
      ? `${minutes} minute${minutes !== 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} second${seconds !== 1 ? 's' : ''}` : ''}`
      : `${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 w-full">
      <div className="bg-white rounded-xl shadow-xl my-4 w-full max-w-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Start Live Quiz</h3>
          <button onClick={onClose} className="text-white hover:text-blue-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Selected Quiz:</h4>
            <p className="text-xl font-bold text-gray-900">{quiz.quizName}</p>
            <p className="text-sm text-gray-500 mt-1">{quiz.questions?.length || 0} Questions</p>
          </div>
          
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Quiz ID:</h4>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-50 font-mono text-lg text-center py-3 px-6 rounded-lg border-2 border-blue-200 flex-grow tracking-wider overflow-x-auto">
                {quizCode}
              </div>
              <button 
                onClick={copyCodeToClipboard}
                className="p-2 rounded-full hover:bg-gray-100"
                title="Copy code"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Share this code with your participants to join the quiz.
            </p>
          </div>
          
          {/* Custom time limit input */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-gray-700 font-medium mb-2">Quiz Settings:</h4>
            
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="timeLimit" className="text-gray-600">Time limit per question (seconds)</label>
              <div className="flex items-center">
                <input 
                  type="text"
                  id="timeLimit"
                  value={timeLimit}
                  onChange={handleTimeLimitChange}
                  className="w-16 bg-white border border-gray-300 rounded px-3 py-1 text-center"
                  placeholder="30"
                />
                <span className="ml-2 text-gray-500">sec</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <label htmlFor="quizDuration" className="text-gray-600">Waiting time before start (minutes)</label>
              <div className="flex items-center">
                <input 
                  type="text"
                  id="quizDuration"
                  value={quizDuration}
                  onChange={handleQuizDurationChange}
                  className="w-16 bg-white border border-gray-300 rounded px-3 py-1 text-center"
                  placeholder="10"
                />
                <span className="ml-2 text-gray-500">min</span>
              </div>
            </div>
            
            
          </div>
          
          {/* Quiz duration information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div>
                <h4 className="text-blue-800 font-medium">Quiz Duration Information</h4>
                <p className="text-blue-700 text-sm mt-1">
                  Estimated completion time: <span className="font-semibold">{estimatedDuration()}</span>
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  Participants will have <span className="font-semibold">{quizDuration} minute{parseInt(quizDuration) !== 1 ? 's' : ''}</span> to join before the quiz begins
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex justify-end space-x-3 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button 
            onClick={startQuiz}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveQuizModal;