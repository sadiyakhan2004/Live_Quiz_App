import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/context/SocketProvider";
import { fetchQuiz } from "@/controllers/quiz";
import { fetchQuestions } from "@/controllers/questions";
import QuestionLayout from "@/components/QuestionTypes/QuestionLayout";
import { submitUserResponses } from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";

// Define interfaces for your data type
interface QuizData {
  quizName: string,
  quizId: string,
  quizCode: string,
  questionIds: string[],
  timeLimit: number,
  waitingTime: number,
  showAnswers: boolean
}

interface QuizProps {
  isHost?: boolean;
  userData?:{ username: string; email: string };
  quizCode?: string;
}

const Quiz : React.FC<QuizProps> = ({ isHost = false, userData , quizCode=""}) => {
  const socket = useSocket();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [questions, setQuestions] = useState<any>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isWaiting, setIsWaiting] = useState(true);
  const [isQuizEnded, setIsQuizEnded] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [quizJoined, setQuizJoined] = useState(false);
  // Countdown state
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  
  const [sessionId, setSessionId] = useState<string>();
  
  // Add a new state for submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    let storedSessionId = localStorage.getItem("sessionId");

    if (!storedSessionId) {
      storedSessionId = uuidv4(); // Create new session ID
      localStorage.setItem("sessionId", storedSessionId || "");
    }

    setSessionId(storedSessionId || "");
  }, []);
  
  // Use ref for interval to avoid cleanup issues
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format waiting time as MM:SS
  const formatWaitingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Format question time as pure seconds
  const formatQuestionTime = (seconds: number): string => {
    return `${seconds}`;
  };

  // Function to handle quick start
  const handleQuickStart = () => {
    if (socket && isHost) {
      console.log("Host clicked quick start");
      socket.emit("quick-start");
    }
  };

  // Fetch quiz data
  useEffect(() => {
    const getQuiz = async () => {
      try {
        const data = await fetchQuiz(quizCode);
        console.log("Fetched quiz data:", data);
        if (data ) {
          let quizName = data.quizName;
          const fetchedQuestions = await fetchQuestions(quizName);
          
          setQuiz(data);
          setQuestions(fetchedQuestions);
        }
      } catch (error) {
        console.error("Error fetching quiz data:", error);
      }
    };
    getQuiz();
  }, []);

  // // Join quiz when data is ready
  // useEffect(() => {
  //   if (socket && quiz && questions.length > 0 && !quizJoined) {
  //     const quizData = {
  //       waitingTime: quiz.waitingTime,
  //       timeLimit: quiz.timeLimit,
  //       questionIds: questions.map((q:any) => q.id),
  //       questions: questions
  //     };
      
  //     socket.emit("join-quiz", quizData);
  //     setQuizJoined(true);
  //   }
  // }, [socket, quiz, questions, quizJoined]);

  // Calculate and update server time offset
  const syncServerTime = (serverTime: number): void => {
    const clientTime = Date.now();
    const offset = serverTime - clientTime;
    setServerTimeOffset(offset);
  };

  // Start a timer synced with server
  const startSyncedTimer = (endTime: number): void => {
    // Clear any existing timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    // Start a new timer that calculates time based on server end time
    timerIntervalRef.current = setInterval(() => {
      const adjustedClientTime = Date.now() + serverTimeOffset;
      const remaining = Math.max(0, Math.floor((endTime - adjustedClientTime) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0 && timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }, 100); // Update more frequently for smoother countdown
  };

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Function to submit responses
  const submitResponses = async () => {
    if (!sessionId) {
      console.error("Session ID is undefined. Cannot submit responses.");
      setIsSubmitting(false);
      setIsQuizEnded(true);
      return;
    }
    
    try {
      setIsSubmitting(true);
      const quizName = quiz?.quizName || "";
      const quizCode = quiz?.quizCode || "";
      const quizId = quiz?.quizId || "";
      const submittedResponse = await submitUserResponses(sessionId, quizName, userData?.username || "", userData?.email || "", quizCode, quizId);
      console.log("Responses submitted successfully:", submittedResponse);
      
      // After successful submission, show the quiz ended UI
      setIsSubmitting(false);
      setIsQuizEnded(true);
    } catch (error) {
      console.error("Error submitting responses:", error);
      // Even if there's an error, we should show the quiz ended UI after a retry
      setIsSubmitting(false);
      setIsQuizEnded(true);
    }
  };

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("room-joined", () => {
      console.log("Room joined successfully, now joining quiz");
      
      // Only proceed if we have the quiz data and haven't joined yet
      if (quiz && questions.length > 0 && !quizJoined) {
        const quizData = {
          waitingTime: quiz.waitingTime,
          timeLimit: quiz.timeLimit,
          questionIds: questions.map((q:any) => q.id),
          questions: questions
        };
        
        socket.emit("join-quiz", quizData);
        setQuizJoined(true);
      }
    });

    socket.on("quiz-waiting", ({ timeLeft, serverTime, endTime }: { timeLeft: number, serverTime: number, endTime: number }) => {
      console.log("Received quiz-waiting event:", { timeLeft, serverTime, endTime });
      syncServerTime(serverTime);
      setIsWaiting(true);
      setIsQuizEnded(false);
      setTimeLeft(timeLeft);
      startSyncedTimer(endTime);
    });

    // Add handlers for countdown events
    socket.on("countdown-start", ({ countdown }: { countdown: number }) => {
      console.log("Countdown started:", countdown);
      setIsCountingDown(true);
      setCountdownValue(countdown);
    });

    socket.on("countdown-update", ({ countdown }: { countdown: number }) => {
      console.log("Countdown update:", countdown);
      setCountdownValue(countdown);
    });

    socket.on("question-update", ({ currentIndex, timeLeft, questionId, questionText, options, serverTime, endTime }: {
      currentIndex: number,
      timeLeft: number,
      questionId: string,
      questionText?: string,
      options?: string[],
      serverTime: number,
      endTime: number
    }) => {
      console.log("Received question-update event:", { currentIndex, timeLeft, questionId, serverTime, endTime });
      syncServerTime(serverTime);
      setIsWaiting(false);
      setIsQuizEnded(false);
      setCurrentIndex(currentIndex);
      setTimeLeft(timeLeft);
      setIsCountingDown(false); // Turn off countdown when question starts
      
      // Find the current question - use server data if available
      let questionData;
      if (questionText && options) {
        questionData = { id: questionId, questionText, options };
      } else {
        questionData = questions.find((q : any) => q.id === questionId) || questions[currentIndex];
      }
      
      if (questionData) {
        setCurrentQuestion(questionData);
        console.log("Current question set to:", questionData);
      }
      startSyncedTimer(endTime);
    });
    
    socket.on("time-update", ({ timeLeft, serverTime }: { timeLeft: number, serverTime: number }) => {
      // Only sync server time from time-update
      syncServerTime(serverTime);
    });

    socket.on("quiz-end", () => {
      console.log("Received quiz-end event");
      setIsWaiting(false);
      setIsCountingDown(false);
      
      // Clear any timer when quiz ends
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      // Start the submission process, but don't immediately show quiz ended
      submitResponses();
    });

    return () => {
      // Clean up event listeners
      socket.off("room-joined");
      socket.off("quiz-waiting");
      socket.off("countdown-start");
      socket.off("countdown-update");
      socket.off("question-update");
      socket.off("time-update");
      socket.off("quiz-end");
    };
  }, [socket, questions, sessionId, quiz]);

  // Render quiz UI
  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-lg">
      {isWaiting ? (
        <div className="text-center py-8">
          {isCountingDown ? (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-3xl font-bold text-indigo-800 mb-4">
                Starting in
              </h2>
              <div className="flex items-center justify-center w-24 h-24 bg-indigo-600 text-white rounded-full animate-pulse">
                <span className="text-4xl font-bold">{countdownValue}</span>
              </div>
              <p className="mt-4 text-lg text-indigo-600">Get ready!</p>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-indigo-800">
                Quiz starting in: 
                <span className="ml-2 inline-block bg-indigo-600 text-white px-4 py-1 rounded-lg min-w-20 text-center">
                  {formatWaitingTime(timeLeft)}
                </span>
              </h2>
              <p className="mt-4 text-lg text-indigo-600">Get ready for an amazing experience!</p>
              {isHost && (
                <button 
                  onClick={handleQuickStart}
                  className="mt-6 bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
                >
                  Quick start
                </button>
              )}
            </>
          )}
        </div>
      ) : isSubmitting ? (
        <div className="text-center py-10">
          <h2 className="text-3xl font-bold text-indigo-800">Submitting Responses...</h2>
          <div className="mt-8 mb-6 flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600"></div>
          </div>
          <p className="mt-4 text-lg text-indigo-600">Please wait while we save your answers</p>
        </div>
      ) : isQuizEnded ? (
        <div className="text-center py-10">
          <h2 className="text-3xl font-bold text-indigo-800">Quiz Complete!</h2>
          <div className="mt-4 mb-6">
            <svg className="mx-auto h-20 w-20 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="mt-2 text-lg text-indigo-600">Thank you for participating!</p>
          
          {/* View Results button - modified to open in a new tab */}
          {isHost && quiz?.quizName && (
        <Link 
        href={`/results?quizName=${encodeURIComponent(quiz.quizName)}&quizCode=${encodeURIComponent(quiz.quizCode || '')}`}
        className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors duration-200 flex items-center mx-auto inline-flex"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        View Results
      </Link>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-6 border-b border-indigo-200 pb-4">
            <h2 className="text-2xl font-bold text-indigo-800">{quiz?.quizName}</h2>
            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
              Question {currentIndex + 1}
            </div>
          </div>
          
          <div className="my-6 p-4 bg-white rounded-lg shadow-md border-l-4 border-indigo-500">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-indigo-800">
                Question {currentIndex + 1}
              </h3>
              <div className="flex items-center space-x-1">
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium text-indigo-800 min-w-16 text-center">
                  {formatQuestionTime(timeLeft)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-6 bg-white p-6 rounded-lg shadow-md min-h-64">
            <QuestionLayout
              question={currentQuestion.currentQn}
              options={currentQuestion.options || []}
              correctAns={currentQuestion.correctAns}
              type={currentQuestion.type || "radio"}
              Qn_id={currentQuestion.questionId}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Quiz;