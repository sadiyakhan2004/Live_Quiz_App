"use client";
import { useSocket } from "@/context/SocketProvider";
import Button from "@/components/ui/Button";
import { useEffect, useState } from "react";
import { fetchRecentQuizResponses } from "@/controllers/response";

interface StatisticsProps {
  isHost: boolean;
  quizName: string;
  roomName: string;
  setShowStatistics: (show: boolean) => void;
  currentQuestion: {
    questionId: string;
    currentQn: {
      heading?: String;
      paras?: [String];
    };
    options?: [String];
    correctAns: string | string[]; // Can be string or array
    type: string;
  };

  endQuiz: boolean;
  participants: any[]; // Add the correct type for participants if available
}

const Statistics: React.FC<StatisticsProps> = ({
  isHost,
  quizName,
  roomName,
  setShowStatistics,
  currentQuestion,
  endQuiz,
  participants,
}) => {
  const socket = useSocket();
  const [responseData, setResponseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "ranking">(
    isHost ? "overview" : "ranking"
  );
  const [highlightedUser, setHighlightedUser] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const quizCode = roomName;
        const data = await fetchRecentQuizResponses(quizName, quizCode);
        setResponseData(data);
      } catch (error) {
        console.error("Error fetching quiz responses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentQuestion, quizName, roomName]);

  // Force ranking tab for non-host participants
  useEffect(() => {
    if (!isHost) {
      setActiveTab("ranking");
    }
  }, [isHost]);

  const handleNextQuestion = () => {
    socket?.emit("next-question", { roomName });
    setShowStatistics(false);
  };

  const handleQuizCompletion = () => {
    socket?.emit("quiz-completion", { roomName });
  };

  // Function to get answer distribution with top 3 and "others" category
  const getAnswerDistribution = () => {
    if (!responseData || !currentQuestion) return [];

    const answerCounts: Record<string, number> = {};
    let totalResponses = 0;

    // Count all unique answers using questionId from currentQuestion
    responseData.forEach((response: any) => {
      // Find responses using the questionId from currentQuestion
      const currentQuestionResponse = response.responses.find(
        (r: any) => r.questionId === currentQuestion.questionId
      );

      if (currentQuestionResponse && currentQuestionResponse.userAns) {
        const userAnswer = currentQuestionResponse.userAns;
        if (Array.isArray(userAnswer)) {
          userAnswer.forEach((ans) => {
            answerCounts[ans] = (answerCounts[ans] || 0) + 1;
            totalResponses++;
          });
        } else {
          answerCounts[userAnswer] = (answerCounts[userAnswer] || 0) + 1;
          totalResponses++;
        }
      }
    });

    // Convert to array and sort by count
    const sortedAnswers = Object.entries(answerCounts)
      .map(([answer, count]) => ({
        answer,
        count,
        percentage:
          totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Get top 3 answers
    const topAnswers = sortedAnswers.slice(0, 3);

    // Calculate "Others" category
    if (sortedAnswers.length > 3) {
      const otherCount = sortedAnswers
        .slice(3)
        .reduce((sum, item) => sum + item.count, 0);
      const otherPercentage =
        totalResponses > 0
          ? Math.round((otherCount / totalResponses) * 100)
          : 0;

      if (otherCount > 0) {
        topAnswers.push({
          answer: "Others",
          count: otherCount,
          percentage: otherPercentage,
        });
      }
    }

    return topAnswers;
  };

  // Function to get the correct answer from currentQuestion
  const getCorrectAnswer = () => {
    if (!currentQuestion) return null;

    if (Array.isArray(currentQuestion.correctAns)) {
      return currentQuestion.correctAns.join(", ");
    }
    return currentQuestion.correctAns;
  };

  // Calculate total responses for a question
  const getTotalResponses = () => {
    if (!responseData || !currentQuestion) return 0;

    let count = 0;

    responseData.forEach((response: any) => {
      const currentQuestionResponse = response.responses.find(
        (r: any) => r.questionId === currentQuestion.questionId
      );

      if (currentQuestionResponse && currentQuestionResponse.userAns) {
        count++;
      }
    });

    return count;
  };

  // Helper function to get the question text
  const getQuestionText = () => {
    if (currentQuestion && currentQuestion.currentQn) {
      return (
        <>
          <div className="font-semibold text-gray-800">
            {currentQuestion.currentQn.heading || "Current Question"}
          </div>
          {currentQuestion.currentQn.paras &&
            currentQuestion.currentQn.paras.length > 0 && (
              <div className="mt-2 text-gray-700">
                {currentQuestion.currentQn.paras.map((para, index) => (
                  <p key={index} className="mb-1">
                    {para}
                  </p>
                ))}
              </div>
            )}
        </>
      );
    }

    return "Current Question";
  };

  // Process participants data with correct rank handling
  const processParticipantsData = () => {
    if (!responseData || !responseData.length) return [];

    // Sort participants by score (and then by correctAnswers as tiebreaker)
    const sortedParticipants = [...responseData].sort(
      (a, b) => b.score - a.score || b.correctAnswers - a.correctAnswers
    );

    // Assign ranks with tie handling
    let currentRank = 1;
    let previousScore: number | null = null;
    let previousCorrectAnswers: number | null = null;
    let skipCount = 0;

    return sortedParticipants.map((participant, index) => {
      // If this participant has same score and correctAnswers as previous,
      // they get the same rank (tie)
      if (
        index > 0 &&
        participant.score === previousScore &&
        participant.correctAnswers === previousCorrectAnswers
      ) {
        skipCount++;
      } else {
        // New score/correctAnswers, so new rank that accounts for skipped positions
        currentRank = index + 1 - skipCount;
      }

      // Store current values for next iteration
      previousScore = participant.score;
      previousCorrectAnswers = participant.correctAnswers;

      return {
        ...participant,
        rank: currentRank,
      };
    });
  };

  // Get appropriate color for answer bar based on correctness
  const getAnswerBarColor = (isCorrect: boolean, isOthers: boolean = false) => {
    if (isOthers) return "bg-gray-400";
    if (isCorrect) return "bg-emerald-500";
    return "bg-red-500";
  };

  // Get color for participant accuracy
  const getAccuracyColor = (accuracyPercentage: number) => {
    if (accuracyPercentage >= 80) return "text-emerald-600";
    if (accuracyPercentage >= 60) return "text-blue-600";
    if (accuracyPercentage >= 40) return "text-yellow-600";
    if (accuracyPercentage >= 20) return "text-orange-600";
    return "text-red-600";
  };

  // Enhanced visualization for rank status
  const getRankBadgeStyle = (rank: number) => {
    if (rank === 1) return "bg-yellow-500"; // Gold
    if (rank === 2) return "bg-gray-400"; // Silver
    if (rank === 3) return "bg-amber-700"; // Bronze
    return "bg-indigo-700"; // Default purple
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white  p-6 rounded-lg shadow-md flex-grow overflow-y-auto">
        <h2 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center">
          <span className="mr-2">{quizName}</span>
        </h2>

        {/* Tab Navigation - Only show for host */}
        {isHost && (
          <div className="flex border-b border-gray-200  mb-6">
            <button
              className={`py-2 px-4 font-medium text-sm focus:outline-none transition-all ${
                activeTab === "overview"
                  ? "text-indigo-600 border-b-2 border-indigo-600"
                  : "text-gray-500  hover:text-gray-700 "
              }`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm focus:outline-none transition-all ${
                activeTab === "ranking"
                  ? "text-indigo-600  border-b-2 border-indigo-600"
                  : "text-gray-500  hover:text-gray-700 "
              }`}
              onClick={() => setActiveTab("ranking")}
            >
              Ranking
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 "></div>
          </div>
        ) : (
          <>
            {/* Enhanced Overview Tab Content - Only shown for host */}
            {/* Enhanced Overview Tab Content - Only shown for host */}
            {isHost && activeTab === "overview" && (
              <div className="space-y-6">
                <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Question Analysis
                  </h3>

                  <div className="bg-white p-4 rounded-lg mb-4 border-l-4 border-indigo-500 shadow-sm">
                    {getQuestionText()}
                  </div>

                  {/* Modified: Removed all bar charts, keeping only data table for all question types */}
                  {currentQuestion &&
                  currentQuestion.options &&
                  currentQuestion.options.length > 0 ? (
                    <div className="mt-6">
                      <h4 className="text-lg font-medium text-gray-700 mb-4 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        Response Distribution
                      </h4>

                      {/* Only data table for detailed analysis */}
                      {/* Data table for detailed analysis with improved styling */}
                      <div className="bg-white p-6 rounded-lg border border-indigo-100 shadow-sm">
                        <h5 className="text-sm font-medium text-indigo-600 mb-3">
                          Detailed Breakdown
                        </h5>
                        <div className="overflow-hidden rounded-lg border border-indigo-100">
                          <table className="min-w-full divide-y divide-indigo-100">
                            <thead className="bg-indigo-50">
                              <tr>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                >
                                  Option
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                >
                                  Responses
                                </th>
                                <th
                                  scope="col"
                                  className="px-4 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                >
                                  Percentage
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-indigo-50">
                              {currentQuestion.options.map(
                                (option: any, index: number) => {
                                  const optionText =
                                    typeof option === "object"
                                      ? option.text
                                      : option;
                                  const correctAns = currentQuestion.correctAns;
                                  const isCorrect = Array.isArray(correctAns)
                                    ? correctAns.includes(optionText)
                                    : correctAns === optionText;

                                  const answerCount = responseData
                                    ? responseData.filter((response: any) => {
                                        const currentQuestionResponse =
                                          response.responses.find(
                                            (r: any) =>
                                              r.questionId ===
                                              currentQuestion.questionId
                                          );

                                        if (!currentQuestionResponse)
                                          return false;

                                        const userAnswer =
                                          currentQuestionResponse.userAns;
                                        if (Array.isArray(userAnswer)) {
                                          return userAnswer.includes(
                                            optionText
                                          );
                                        }
                                        return userAnswer === optionText;
                                      }).length
                                    : 0;

                                  const percentage =
                                    responseData && responseData.length > 0
                                      ? Math.round(
                                          (answerCount / responseData.length) *
                                            100
                                        )
                                      : 0;

                                  return (
                                    <tr
                                      key={index}
                                      className={isCorrect ? "bg-blue-50" : ""}
                                    >
                                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                        {isCorrect && (
                                          <svg
                                            className="h-4 w-4 text-green-600 mr-2"
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        )}
                                        <span
                                          className={
                                            isCorrect ? "font-medium" : ""
                                          }
                                        >
                                          {optionText}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        {answerCount}
                                      </td>
                                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                        <div className="flex items-center">
                                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                                            <div
                                              className={`h-2 rounded-full ${
                                                isCorrect
                                                  ? "bg-gradient-to-r from-indigo-600 to-blue-400"
                                                  : "bg-gray-400"
                                              }`}
                                              style={{
                                                width: `${percentage}%`,
                                              }}
                                            ></div>
                                          </div>
                                          {percentage}%
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 bg-indigo-50 rounded-lg p-3 flex items-center justify-between">
                          <div className="text-sm text-indigo-800">
                            <span className="font-medium">
                              Participation rate:
                            </span>{" "}
                            {responseData.length > 0
                              ? Math.round(
                                  (getTotalResponses() /
                                    (participants.length - 1)) *
                                    100
                                )
                              : 0}
                            %
                          </div>
                          <div className="text-sm text-indigo-800">
                            <span className="font-medium">
                              Total responses:
                            </span>{" "}
                            {getTotalResponses()} / {participants.length - 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <h4 className="text-lg font-medium text-indigo-700 mb-4 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        Response Distribution
                      </h4>

                      {getAnswerDistribution().length > 0 ? (
                        <div className="bg-white rounded-lg border border-indigo-100 shadow-sm">
                          <div className="overflow-hidden">
                            <table className="min-w-full divide-y divide-indigo-100">
                              <thead className="bg-indigo-50">
                                <tr>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                  >
                                    Answer
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                  >
                                    Count
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                  >
                                    Percentage
                                  </th>
                                  <th
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-indigo-700 uppercase tracking-wider"
                                  >
                                    Status
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-indigo-50">
                                {getAnswerDistribution().map(
                                  (answerData, index) => {
                                    const isCorrect =
                                      getCorrectAnswer() === answerData.answer;
                                    const isOthers =
                                      answerData.answer === "Others";

                                    return (
                                      <tr
                                        key={index}
                                        className={
                                          isCorrect ? "bg-blue-50" : ""
                                        }
                                      >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm font-medium text-gray-900">
                                            {isOthers
                                              ? "Other responses"
                                              : answerData.answer}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="text-sm text-gray-600">
                                            {answerData.count}
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            <div className="w-20 bg-gray-200 rounded-full h-2 mr-2 overflow-hidden">
                                              <div
                                                className={`h-2 rounded-full ${
                                                  isCorrect
                                                    ? "bg-gradient-to-r from-green-500 to-emerald-400"
                                                    : isOthers
                                                    ? "bg-gray-400"
                                                    : "bg-indigo-400"
                                                }`}
                                                style={{
                                                  width: `${answerData.percentage}%`,
                                                }}
                                              ></div>
                                            </div>
                                            <span className="text-sm text-gray-600">
                                              {answerData.percentage}%
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                          {isCorrect ? (
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                              Correct
                                            </span>
                                          ) : (
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                              Incorrect
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  }
                                )}
                              </tbody>
                            </table>
                          </div>

                          <div className="border-t border-indigo-100 px-6 py-4">
                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium text-indigo-700">
                                  Total responses:
                                </span>{" "}
                                <span className="text-gray-600">
                                  {getTotalResponses()} out of{" "}
                                  {participants.length - 1} participants
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-indigo-700">
                                  Correct answer:
                                </span>{" "}
                                <span className="text-green-500">
                                  "{getCorrectAnswer()}"
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Always show correct answer if it exists */}
                          {getCorrectAnswer() &&
                            getAnswerDistribution().length > 0 &&
                            !getAnswerDistribution().some(
                              (a) => a.answer === getCorrectAnswer()
                            ) && (
                              <div className="border-t border-gray-200 px-6 py-4 bg-yellow-50">
                                <div className="flex items-start">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-yellow-500 mr-2"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">
                                      No participant selected the correct answer
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                      The correct answer was "
                                      {getCorrectAnswer()}"
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-lg text-center border border-indigo-100 shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 text-indigo-300 mx-auto mb-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <p className="text-indigo-700 font-semibold text-lg">
                            No responses submitted yet
                          </p>
                          <p className="text-indigo-600 text-sm mt-2">
                            Results will appear once participants submit their
                            answers
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Insight card - removed average time */}
                {responseData &&
                  responseData.length > 0 &&
                  getTotalResponses() > 0 && (
                    <div className="bg-gradient-to-br from-white to-indigo-50 p-5 rounded-lg border border-indigo-100 shadow-md">
                      <h4 className="text-lg font-medium text-indigo-800 mb-4 flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-2 text-indigo-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Question Insights
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-6 rounded-lg shadow-md">
                          <div className="text-sm text-indigo-100 mb-1">
                            Response Rate
                          </div>
                          <div className="text-3xl font-bold text-white">
                            {Math.round(
                              (getTotalResponses() /
                                (participants.length - 1)) *
                                100
                            )}
                            %
                          </div>
                          <div className="mt-2 text-xs text-indigo-100">
                            {getTotalResponses()} out of{" "}
                            {participants.length - 1} participants answered
                          </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-6 rounded-lg shadow-md">
                          <div className="text-sm text-indigo-100 mb-1">
                            Accuracy Rate
                          </div>
                          <div className="text-3xl font-bold text-white">
                            {getTotalResponses() > 0
                              ? Math.round(
                                  (responseData.filter((response: any) => {
                                    const currentQuestionResponse =
                                      response.responses.find(
                                        (r: any) =>
                                          r.questionId ===
                                          currentQuestion.questionId
                                      );

                                    if (
                                      !currentQuestionResponse ||
                                      !currentQuestionResponse.userAns
                                    )
                                      return false;

                                    const userAnswer =
                                      currentQuestionResponse.userAns;
                                    const correctAns =
                                      currentQuestion.correctAns;

                                    if (
                                      Array.isArray(userAnswer) &&
                                      Array.isArray(correctAns)
                                    ) {
                                      return (
                                        userAnswer.length ===
                                          correctAns.length &&
                                        userAnswer.every((ans) =>
                                          correctAns.includes(ans)
                                        )
                                      );
                                    } else if (
                                      !Array.isArray(userAnswer) &&
                                      !Array.isArray(correctAns)
                                    ) {
                                      return userAnswer === correctAns;
                                    }

                                    return false;
                                  }).length /
                                    getTotalResponses()) *
                                    100
                                )
                              : 0}
                            %
                          </div>
                          <div className="mt-2 text-xs text-indigo-100">
                            Percentage of correct responses
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                <div className="mt-6">
                  {endQuiz ? (
                    <div className="bg-gradient-to-br from-white to-green-50 p-5 rounded-lg border border-green-100 shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-medium text-green-800">
                            Quiz Completion
                          </h4>
                          <p className="text-gray-900 text-sm mt-1">
                            This was the final question of the quiz
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={handleQuizCompletion}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 transition-colors flex items-center justify-center shadow-lg"
                      >
                        End Quiz
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleNextQuestion}
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 transition-colors flex items-center justify-center shadow-lg"
                    >
                      Proceed to Next Question
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 ml-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            )}{" "}
            {/* Enhanced Ranking Tab Content */}
            {(activeTab === "ranking" || !isHost) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold text-indigo-800 flex items-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Leaderboard
                  </h3>

                  {responseData && responseData.length > 0 && (
                    <div className="text-sm bg-indigo-100 text-indigo-800 font-medium py-1 px-3 rounded-full">
                      {responseData.length}{" "}
                      {responseData.length === 1
                        ? "Participant"
                        : "Participants"}
                    </div>
                  )}
                </div>

                {responseData && responseData.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-4 shadow-inner">
                    <div className="space-y-3">
                      {processParticipantsData().map(
                        (participant: any, index: number) => {
                          const rank = participant.rank;

                          // Find max score for relative scaling
                          const maxScore = responseData.reduce(
                            (max: number, p: any) =>
                              p.score > max ? p.score : max,
                            0
                          );

                          const scoreBarWidth =
                            maxScore > 0
                              ? `${(participant.score / maxScore) * 100}%`
                              : "0%";

                          const accuracyPercentage =
                            participant.totalQuestions > 0
                              ? Math.round(
                                  (participant.correctAnswers /
                                    participant.totalQuestions) *
                                    100
                                )
                              : 0;

                          const isHighlighted =
                            participant.userId === highlightedUser;

                          return (
                            <div
                              key={participant.userId || index}
                              className={`relative rounded-lg p-4 transition-all duration-300 ${
                                isHighlighted
                                  ? "bg-indigo-50 shadow-md scale-102"
                                  : "bg-white hover:bg-gray-50"
                              } ${rank <= 3 ? "border-l-4" : ""} ${
                                rank === 1
                                  ? "border-yellow-400"
                                  : rank === 2
                                  ? "border-gray-400"
                                  : rank === 3
                                  ? "border-amber-700"
                                  : ""
                              }`}
                              onMouseEnter={() =>
                                setHighlightedUser(participant.userId || "")
                              }
                              onMouseLeave={() => setHighlightedUser(null)}
                            >
                              <div className="flex items-center space-x-4">
                                {/* Enhanced ranking badge */}
                                <div
                                  className={`flex-shrink-0 w-10 h-10 rounded-full ${getRankBadgeStyle(
                                    rank
                                  )} text-white flex items-center justify-center font-bold shadow-md`}
                                >
                                  {rank}
                                </div>

                                {/* User info with enhanced visualization */}
                                <div className="flex-grow">
                                  <div className="flex justify-between items-center mb-2">
                                    <div className="font-medium text-gray-900 flex items-center">
                                      {participant.username || "Anonymous"}
                                      {rank === 1 && (
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-5 w-5 text-yellow-500 ml-1"
                                          viewBox="0 0 20 20"
                                          fill="currentColor"
                                        >
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="text-indigo-700 font-bold text-lg">
                                      {participant.score} pts
                                    </div>
                                  </div>

                                  {/* Enhanced score bar */}
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                      className={`h-3 rounded-full bg-indigo-600`}
                                      style={{ width: scoreBarWidth }}
                                    ></div>
                                  </div>

                                  {/* Enhanced stats with color coding */}
                                  <div className="flex justify-between mt-2 text-sm">
                                    <span className="flex items-center">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 mr-1 text-green-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      <span className="text-gray-700">
                                        {participant.correctAnswers || 0}/
                                        {participant.totalQuestions || 0}{" "}
                                        correct
                                      </span>
                                    </span>
                                    <span
                                      className={`font-medium ${getAccuracyColor(
                                        accuracyPercentage
                                      )}`}
                                    >
                                      {accuracyPercentage}% accuracy
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50 rounded-lg p-8 text-center">
                    <p className="text-indigo-800 font-medium text-lg mb-2">
                      No participants data available
                    </p>
                    <p className="text-indigo-600">
                      Rankings will appear once participants submit their
                      answers
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Statistics;
