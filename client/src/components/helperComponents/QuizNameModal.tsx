
import React from 'react';
import Input from '../ui/Input';

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
    <div className="fixed inset-0 bg-slate-800/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-100">
        <div className="relative">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 w-full absolute top-0 left-0"></div>
          
          <div className="p-6 pt-8">
            <h3 className="text-2xl font-semibold text-slate-800 mb-4">Name Your Quiz</h3>
            
            <div className="mt-5 mb-6">
              <Input
                type="text"
                id="quiz-name"
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 transition-all duration-300 shadow-sm"
                label="Quiz Name"
                focusedLabelClassName="text-indigo-600 bg-white"
                backgroundColor="bg-white"
                value={quizName}
                onChange={(e:any) => setQuizName(e.target.value)}
                
              />
              
              {quizName.trim() === '' && (
                <p className="mt-2 text-sm text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Please enter a name for your quiz
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t border-slate-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={!quizName.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                type="button"
              >
                Create Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizNameModal;