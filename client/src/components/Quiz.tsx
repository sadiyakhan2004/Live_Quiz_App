import { useEffect, useState, useRef } from "react";
import { useSocket } from "@/context/SocketProvider";
import { fetchQuiz } from "@/controllers/quiz";
import { fetchQuestions } from "@/controllers/questions";
import QuestionLayout from "@/components/QuestionTypes/QuestionLayout";
import { submitUserResponses } from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";
import Link from "next/link";
import { QuizTimer } from "./helperComponents/QuizTimer";
import Button from "./ui/Button";
import Statistics from "./helperComponents/Statistics";

// Define interfaces for your data type
interface QuizData {
  quizName: string;
  quizId: string;
  quizCode: string;
  questionIds: string[];
  timeLimit: number;
  waitingTime: number;
  showAnswers: boolean;
}

interface QuizProps {
  quizCode: string;
}

const Quiz: React.FC<QuizProps> = ({ quizCode }) => {
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
  const [userData, setUserData] = useState<any>();
  const [isHost, setIsHost] = useState(false);
  const [endQuiz, setEndQuiz] = useState(false);

  // Add a new state for timer warning
  const [isTimerWarning, setIsTimerWarning] = useState(false);

  // Countdown state
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);

  // New state for question transition countdown
  const [isQuestionCountingDown, setIsQuestionCountingDown] = useState(false);
  const [questionCountdownValue, setQuestionCountdownValue] = useState(3);
  const [pendingQuestionData, setPendingQuestionData] = useState<any>(null);

  const [sessionId, setSessionId] = useState<string>();

  // Add a new state for submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);

  // Track if current question has been submitted
  const [currentQuestionSubmitted, setCurrentQuestionSubmitted] =
    useState(false);

  // Audio refs for custom sounds
  const tickSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create an audio element for the tick sound
    const tickSound = new Audio();
    tickSound.src = "/sounds/ticking-sound.mp3";
    tickSound.load();

    // Store the audio element in the ref
    tickSoundRef.current = tickSound;

    // Clean up function
    return () => {
      if (tickSoundRef.current) {
        tickSoundRef.current.pause();
        tickSoundRef.current = null;
      }
    };
  }, []);

  //  play the tick sound
  const playTickSound = () => {
    if (tickSoundRef.current) {
      // Reset the sound to the beginning if it's already playing
      tickSoundRef.current.currentTime = 0;
      tickSoundRef.current.play().catch((err) => {
        console.error("Error playing sound:", err);
      });
    }
  };

  // stop the tick sound
  const stopTickSound = () => {
    if (tickSoundRef.current) {
      tickSoundRef.current.pause();
      tickSoundRef.current.currentTime = 0;
    }
  };

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
  const questionCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format waiting time as MM:SS
  const formatWaitingTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
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
        if (data) {
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

    // Stop any playing sound when starting a new timer
    //stopTickSound();

    // Track the last second to prevent multiple sounds in same second
    let lastTickSecond = -1;

    // Start a new timer that calculates time based on server end time
    timerIntervalRef.current = setInterval(() => {
      const adjustedClientTime = Date.now() + serverTimeOffset;
      const remaining = Math.max(
        0,
        Math.floor((endTime - adjustedClientTime) / 1000)
      );

      setTimeLeft(remaining);

      // Play tick sound when time is low (last 5 seconds)
      if (remaining <= 5 && remaining > 0) {
        setIsTimerWarning(true);

        // Ensure we only play once per second
        if (remaining !== lastTickSecond) {
          playTickSound();
          lastTickSecond = remaining;
        }
      } else {
        setIsTimerWarning(false);

        // If we were in warning state and now we're not, stop the sound
        if (lastTickSecond !== -1 && remaining > 5) {
          stopTickSound();
          lastTickSecond = -1;
        }
      }

      // Handle timer completion
      if (remaining <= 0) {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }

        // Make sure to stop the sound when timer reaches zero
        stopTickSound();
        setIsTimerWarning(false);
      }
    }, 100); // Update more frequently for smoother countdown
  };

  // Function to handle manual cancellation of timer
  const cancelTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Make sure to stop the sound when cancelling timer
    stopTickSound();
    setIsTimerWarning(false);
  };

  // Function to start question transition countdown
  const startQuestionCountdown = (questionData: any) => {
    // Store the pending question data
    setPendingQuestionData(questionData);

    // Set countdown state
    setIsQuestionCountingDown(true);
    setQuestionCountdownValue(3); // Start with 3 seconds

    // Clear any existing countdown timer
    if (questionCountdownIntervalRef.current) {
      clearInterval(questionCountdownIntervalRef.current);
    }

    // Start countdown interval
    questionCountdownIntervalRef.current = setInterval(() => {
      setQuestionCountdownValue((prev) => {
        const newValue = prev - 1;
        if (newValue <= 0) {
          // When countdown reaches zero, show the question
          clearInterval(questionCountdownIntervalRef.current!);
          processQuestionUpdate(questionData);
          setIsQuestionCountingDown(false);
          return 0;
        }
        return newValue;
      });
    }, 1000);
  };

  // Function to process question update after countdown
  const processQuestionUpdate = (data: any) => {
    const {
      currentIndex,
      timeLeft,
      questionId,
      questionText,
      options,
      serverTime,
      endTime,
    } = data;

    setIsWaiting(false);
    setIsQuizEnded(false);
    setCurrentIndex(currentIndex);
    setTimeLeft(timeLeft);
    setCurrentQuestionSubmitted(false);

    setShowStatistics(false);

    // Find the current question
    let questionData;
    if (questionText && options) {
      questionData = { id: questionId, questionText, options };
    } else {
      questionData =
        questions.find((q: any) => q.id === questionId) ||
        questions[currentIndex];
    }

    if (questionData) {
      setCurrentQuestion(questionData);
      console.log("Current question set to:", questionData);
    }

    startSyncedTimer(endTime);
  };

  // Handle cleanup
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (questionCountdownIntervalRef.current) {
        clearInterval(questionCountdownIntervalRef.current);
      }
    };
  }, []);

  // Function to submit current question response
  const submitCurrentQuestionResponse = async () => {
    if (!sessionId || isSubmitting || isHost || currentQuestionSubmitted) {
      return;
    }
    setIsSubmitting(true);

    try {
      const quizName = quiz?.quizName || "";
      const quizCode = quiz?.quizCode || "";
      const quizId = quiz?.quizId || "";

      // Set isCompleted to false for individual question submissions
      const isCompleted = currentIndex === questions.length - 1;

      const submittedResponse = await submitUserResponses(
        sessionId,
        quizName,
        userData?.username || "",
        userData?.email || "",
        quizCode,
        quizId,
        isCompleted
      );

      console.log("Response submitted successfully:", submittedResponse);
      setCurrentQuestionSubmitted(true);
    } catch (error) {
      console.error("Error submitting response:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to handle the end of the quiz
  const handleQuizEnd = async () => {
    // Clear any timer when quiz ends
    cancelTimer();

    if (questionCountdownIntervalRef.current) {
      clearInterval(questionCountdownIntervalRef.current);
      questionCountdownIntervalRef.current = null;
    }

    // Set quiz as ended
    setIsQuizEnded(true);
    setIsWaiting(false);
    setIsCountingDown(false);
    setIsQuestionCountingDown(false);
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (questionCountdownIntervalRef.current) {
        clearInterval(questionCountdownIntervalRef.current);
      }
      stopTickSound();
    };
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("room-joined", ({ isHost, userData }) => {
      console.log("Room joined successfully, now joining quiz");
      setUserData(userData);
      setIsHost(isHost);

      // Only proceed if we have the quiz data and haven't joined yet
      if (quiz && questions.length > 0 && !quizJoined) {
        const quizData = {
          waitingTime: quiz.waitingTime,
          timeLimit: quiz.timeLimit,
          questionIds: questions.map((q: any) => q.id),
          questions: questions,
        };

        socket.emit("join-quiz", quizData);
        setQuizJoined(true);
      }
    });

    socket.on(
      "quiz-waiting",
      ({
        timeLeft,
        serverTime,
        endTime,
      }: {
        timeLeft: number;
        serverTime: number;
        endTime: number;
      }) => {
        console.log("Received quiz-waiting event:", {
          timeLeft,
          serverTime,
          endTime,
        });

        syncServerTime(serverTime);
        setIsWaiting(true);
        setIsQuizEnded(false);
        setIsCountingDown(false);
        setIsQuestionCountingDown(false);
        setTimeLeft(timeLeft);
        startSyncedTimer(endTime);
      }
    );

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

    socket.on(
      "question-update",
      (data: {
        currentIndex: number;
        timeLeft: number;
        questionId: string;
        questionText?: string;
        options?: string[];
        serverTime: number;
        endTime: number;
      }) => {
        console.log("Received question-update event:", data);
        syncServerTime(data.serverTime);

        // Start question transition countdown instead of immediately showing the question
        startQuestionCountdown(data);
      }
    );

    socket.on(
      "time-update",
      ({ timeLeft, serverTime }: { timeLeft: number; serverTime: number }) => {
        // Only sync server time from time-update
        syncServerTime(serverTime);
      }
    );

    socket.on("time-out", () => setShowStatistics(true));

    socket.on("quiz-end", () => {
      console.log("Received quiz-end event");
      setEndQuiz(true);
      setShowStatistics(true);
    });

    socket.on("quiz-completed", () => handleQuizEnd());

    return () => {
      // Clean up event listeners
      socket.off("room-joined");
      socket.off("quiz-waiting");
      socket.off("countdown-start");
      socket.off("countdown-update");
      socket.off("question-update");
      socket.off("time-update");
      socket.off("time-out", () => setShowStatistics(true));
      socket.off("quiz-end");
      socket.off("quiz-completed", () => handleQuizEnd());
    };
  }, [socket, questions, sessionId, quiz, currentQuestionSubmitted]);

  // Handler for manual submission button click
  const handleSubmitButtonClick = () => {
    if (!currentQuestionSubmitted) {
      submitCurrentQuestionResponse();
    }
  };

  // Render quiz UI
  return (
    <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-xl shadow-lg h-full w-full overflow-y-auto">
      {isWaiting ? (
        <div className="text-center py-16 text-white">
          {isCountingDown ? (
            <div className="flex flex-col items-center justify-center">
              <h2 className="text-4xl font-bold mb-6">Ready?</h2>
              <div className="relative">
                <div className="w-32 h-32 bg-white bg-opacity-10 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <span className="text-6xl font-bold">{countdownValue}</span>
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-blue-400 opacity-30 animate-ping"></div>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto bg-white bg-opacity-5 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
              <h2 className="text-3xl font-bold mb-6">Quiz Starting Soon</h2>
              <div className="text-center">
                <div className="inline-block bg-white bg-opacity-10 backdrop-blur-sm px-6 py-3 rounded-xl text-2xl font-medium">
                  {formatWaitingTime(timeLeft)}
                </div>
              </div>
              {isHost && (
                <button
                  onClick={handleQuickStart}
                  className="mt-8 bg-gradient-to-r from-blue-800 to-blue-600 px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-500 transition-all duration-200 shadow-lg w-full"
                >
                  Start Now
                </button>
              )}
            </div>
          )}
        </div>
      ) : isQuestionCountingDown ? (
        <div className="flex flex-col items-center justify-center py-16 text-white">
          <h2 className="text-3xl font-bold mb-6">Next Question</h2>
          <div className="relative">
            <div className="w-24 h-24 bg-white bg-opacity-10 backdrop-blur-sm rounded-full flex items-center justify-center">
              <span className="text-5xl font-bold">
                {questionCountdownValue}
              </span>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 opacity-30 animate-ping"></div>
          </div>
        </div>
      ) : isQuizEnded ? (
        <div className="text-center py-16 text-white">
          <div className="max-w-md mx-auto bg-white bg-opacity-5 backdrop-blur-md p-8 rounded-2xl shadow-2xl">
            <svg
              className="mx-auto h-16 w-16 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-3xl font-bold mt-4">Quiz Complete!</h2>

            {isHost && quiz?.quizName && (
              <Link
                href={`/results?quizName=${encodeURIComponent(
                  quiz.quizName
                )}&quizCode=${encodeURIComponent(quiz.quizCode || "")}`}
                className="mt-8 bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-500 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Results
              </Link>
            )}
          </div>
        </div>
      ) : showStatistics ? (
        <div className="h-full w-full">
          <Statistics
            isHost={isHost}
            quizName={quiz?.quizName || ""}
            roomName={quiz?.quizCode || ""}
            setShowStatistics={setShowStatistics}
            currentQuestion={currentQuestion}
            endQuiz={endQuiz}
          />
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Top Bar with Timer - Only shown for non-host */}
          {!isHost && (
            <div className="bg-slate-800 bg-opacity-70 backdrop-blur-sm px-4 py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="bg-blue-900 rounded-lg px-2 py-1 text-xs font-medium text-white">
                  Q{currentIndex + 1}
                </div>
                <h2 className="text-lg font-medium text-white truncate">
                  {quiz?.quizName}
                </h2>
              </div>

              {/* Timer Element - Only for non-host users */}
              {timeLeft > 5 ? (
                <div className="bg-slate-700 rounded-lg px-3 py-1 text-white font-medium flex items-center gap-1">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {formatQuestionTime(timeLeft)}
                </div>
              ) : (
                <div className="bg-red-600 rounded-lg px-3 py-1 text-white font-medium flex items-center gap-1 animate-pulse">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {timeLeft}
                </div>
              )}
            </div>
          )}

          {/* Main Quiz Content Area */}
          <div
            className={`flex-grow p-4 overflow-y-auto ${isHost ? "pt-3" : ""}`}
          >
            {isHost ? (
              <div
                className={`bg-slate-800 bg-opacity-50 backdrop-blur-md rounded-xl p-5 text-white h-full shadow-xl ${
                  timeLeft <= 5 && !currentQuestionSubmitted
                    ? "bg-red-900 bg-opacity-30"
                    : ""
                }`}
              >
                {/* Top Question Info */}
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-blue-900 rounded-lg px-2 py-1 text-xs font-medium text-white">
                    Question{currentIndex + 1}
                  </div>
                  <h2 className="text-lg font-medium text-white truncate">
                    {quiz?.quizName}
                  </h2>
                </div>

                {/* Host Question View */}
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-3">
                    {currentQuestion?.currentQn?.heading}
                  </h3>
                  {currentQuestion?.currentQn?.paras?.map(
                    (para: any, i: number) => (
                      <p key={i} className="text-white text-opacity-80 mb-2">
                        {para}
                      </p>
                    )
                  )}
                </div>

                {/* Compact Options for Host */}
                {currentQuestion?.options && (
                  <div className="space-y-2 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {currentQuestion.options.map(
                        (option: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-lg text-sm ${
                              currentQuestion.correctAns ===
                              (option.value || idx)
                                ? "bg-blue-900 bg-opacity-70 border border-blue-400"
                                : "bg-slate-700 bg-opacity-50 border border-slate-600"
                            }`}
                          >
                            <span className="font-medium">
                              {option.label || String.fromCharCode(65 + idx)}.
                            </span>{" "}
                            {option.text || option}
                            {currentQuestion.correctAns ===
                              (option.value || idx) && (
                              <span className="ml-1 text-blue-300">✓</span>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Host Timer Circle - Centered */}
                <div className="flex justify-center items-center mt-8">
                  <div className={`relative`}>
                    <div
                      className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg ${
                        timeLeft <= 5
                          ? "bg-red-900 bg-opacity-60 animate-pulse"
                          : "bg-blue-900 bg-opacity-50"
                      }`}
                    >
                      <span className="text-4xl font-bold">
                        {formatQuestionTime(timeLeft)}
                      </span>
                    </div>
                    <div
                      className={`absolute inset-0 rounded-full border-4 ${
                        timeLeft <= 5 ? "border-red-500" : "border-blue-400"
                      } opacity-30 ${timeLeft <= 5 ? "animate-ping" : ""}`}
                    ></div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={`bg-white rounded-xl shadow-2xl p-5 h-full relative overflow-hidden`}
              >
                {/* Alarm overlay for last 5 seconds when not submitted */}
                {timeLeft <= 5 && !currentQuestionSubmitted && (
                  <div className="absolute inset-0 bg-red-500 opacity-10 pointer-events-none animate-pulse"></div>
                )}

                {/* Compact Answer Options */}
                {currentQuestion && (
                  <div className="mb-8">
                    <QuestionLayout
                      question={currentQuestion.currentQn}
                      options={currentQuestion.options || []}
                      correctAns={currentQuestion.correctAns}
                      type={currentQuestion.type || "radio"}
                      Qn_id={currentQuestion.questionId}
                    />
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleSubmitButtonClick}
                    disabled={currentQuestionSubmitted || isSubmitting}
                    className={`px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                      currentQuestionSubmitted
                        ? "bg-slate-400"
                        : timeLeft <= 5
                        ? "bg-gradient-to-r from-red-600 to-red-500 animate-pulse shadow-lg transform hover:scale-105"
                        : "bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-700 hover:to-blue-500 shadow-lg"
                    }`}
                  >
                    {currentQuestionSubmitted
                      ? "Submitted"
                      : isSubmitting
                      ? "Submitting..."
                      : timeLeft <= 5
                      ? "Submit Now!"
                      : "Submit"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;
