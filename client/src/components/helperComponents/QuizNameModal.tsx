import React from 'react';

interface QuizNameModalProps {
  isOpen: boolean;
  quizName: string;
  setQuizName: (name: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const QuizNameModal: React.FC<QuizNameModalProps> = ({
  isOpen,
  quizName,
  setQuizName,
  onClose,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Name Your Quiz</h3>
        </div>
        
        <div className="p-5">
          <label htmlFor="quiz-name" className="block text-sm font-medium text-gray-700 mb-2">
            Enter a name for your quiz:
          </label>
          <input
            type="text"
            id="quiz-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., Math Quiz Spring 2025"
            value={quizName}
            onChange={(e) => setQuizName(e.target.value)}
            autoFocus
          />
          
          {quizName.trim() === '' && (
            <p className="mt-2 text-sm text-red-600">
              Please enter a name for your quiz
            </p>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!quizName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizNameModal;