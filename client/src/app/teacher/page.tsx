"use client";
import { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import Sidebar from "@/components/ui/Sidebar";
import {
  Book,
  Layout,
  ArrowLeft,
  HelpCircle,
  Menu,
  PanelLeft,
  PanelRight,
  Trash2,
} from "lucide-react";
import CheckBoxQuizComponent from "@/components/QuestionTypes/CheckboxQuiz";
import ShortAnswerComponent from "@/components/QuestionTypes/ShortAnswerQuiz";
import RadioQuizComponent from "@/components/QuestionTypes/RadioQuiz";
import DropDownComponent from "@/components/QuestionTypes/DropDownQuiz";
import DndComponent from "@/components/QuestionTypes/DND";
import FillInTheBlankComponent from "@/components/QuestionTypes/FillInTheBlankQuiz";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import Tooltip from "@/components/ui/Tooltip";
import {
  clearQuestions,
  deleteQuestion,
  reorderQuestions,
} from "@/store/features/questionSlice";
import { useQuestions, QuestionData } from "@/context/QuestionProvider";
import QuestionLayout from "@/components/QuestionTypes/QuestionLayout";
import React, { ReactNode } from "react";
import { X, Copy, Check } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import Button from "@/components/ui/Button";
import QuizNameModal from "@/components/helperComponents/QuizNameModal";
import { fetchQuestions, addQuestionInDatabase } from "@/controllers/questions";
import { fetchAllTests, deleteTest } from "@/controllers/tests";
import LiveQuizModal from "@/components/helperComponents/LiveQuizModal";
import Link from "next/link";

interface SortableQuestionProps {
  question: Question;
  id: string;
  onQuestionPreview: (question: Question) => void;
  activeQuestionId?: string | null;
}

// Define types for the question structure
interface Question {
  questionId: string;
  currentQn: {
    heading?: string;
    subHeadings?: string[];
    paras?: string[];
  };
  options?: string[];
  correctAns: string[] | string;
  type:
    | "checkbox"
    | "radio"
    | "short-answer"
    | "fill-in-the-blank"
    | "dropdown"
    | "dnd";
}
interface PageThumbnailPreviewProps {
  children: ReactNode;
  onClick?: () => void;
}

interface AutoScalingContentProps {
  children: ReactNode;
}

const PageThumbnailPreview: React.FC<PageThumbnailPreviewProps> = ({
  children,
  onClick,
}) => (
  <div className="relative w-48 h-32" onClick={onClick}>
    <div
      className="transform scale-[0.4] origin-top-left absolute bg-white rounded-3xl"
      style={{ width: "250%", height: "250%" }}
    >
      {children}
    </div>
  </div>
);

const AutoScalingContent: React.FC<AutoScalingContentProps> = ({
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const contentWidth = contentRef.current.scrollWidth;
        const contentHeight = contentRef.current.scrollHeight;

        // Calculate scale factors for width and height
        const widthScale = containerWidth / contentWidth;
        const heightScale = containerHeight / contentHeight;

        // Use the smaller scale to ensure content fits both dimensions
        const newScale = Math.min(widthScale, heightScale, 1);

        setScale(newScale);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden">
      <div
        ref={contentRef}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: scale !== 1 ? `${100 / scale}%` : "100%",
          height: scale !== 1 ? `${100 / scale}%` : "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
};

const SortableQuestion = ({
  question,
  id,
  onQuestionPreview,
  activeQuestionId,
}: SortableQuestionProps) => {
  const dispatch = useAppDispatch();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if this question is active
  const isActive = question.questionId === activeQuestionId;

  // Find the index of this question in the questions array
  const questions = useAppSelector((state) => state.questions.questions);
  const questionIndex = questions.findIndex(
    (q) => q.questionId === question.questionId
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group mb-3 ${isDragging ? "z-50" : "z-0"} `}
      {...attributes}
    >
      {/* Simple gray slide number */}
      <div className="absolute left-3 top-2 text-gray-500 font-medium text-sm">
        {questionIndex + 1}
      </div>

      {/* <div className="py-3 px-4"> */}

      <div className="w-full ml-4 py-1 px-4 rounded-3xl">
        <PageThumbnailPreview onClick={() => onQuestionPreview(question)}>
          <div
            {...listeners}
            className={`bg-white h-full w-full p-8 rounded-3xl shadow-lg border-2 cursor-grab active:cursor-grabbing  
                  ${isActive ? "ring-4 ring-blue-700" : "border-blue-800"}`}
          >
            <AutoScalingContent>
              <QuestionLayout
                question={question.currentQn}
                options={question.options}
                correctAns={question.correctAns}
                type={question.type}
                Qn_id={question.questionId}
                reviewMode={true}
              />
            </AutoScalingContent>
          </div>
        </PageThumbnailPreview>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch(deleteQuestion(question.questionId));
        }}
        className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-200"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface ViewQuestionsSidebarProps {
  onQuestionPreview: (question: Question) => void;
  activeQuestionId?: string | null;
  setSuccessMessage: (message: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
  setShowQuizNameModal: (show: boolean) => void; // Updated type
  submitToDatabase?: () => void;
}

const ViewQuestionsSidebar: React.FC<ViewQuestionsSidebarProps> = ({
  onQuestionPreview,
  activeQuestionId,
  setSuccessMessage,
  setShowQuizNameModal,
  isOpen,
  onClose,
  submitToDatabase,
}) => {
  const questions = useAppSelector((state) => state.questions.questions);
  const dispatch = useAppDispatch();
  const [orderedQuestions, setOrderedQuestions] = useState(questions);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: { y: 5, x: 0 },
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex(
        (item) => item.questionId === active.id
      );
      const newIndex = questions.findIndex(
        (item) => item.questionId === over.id
      );
      const newOrder = arrayMove(questions, oldIndex, newIndex);

      // Dispatch the new order to Redux
      dispatch(reorderQuestions(newOrder));
    }
  };

  useEffect(() => {
    setOrderedQuestions(questions);
  }, [questions]);

  // Apply transition class for smooth animation
  const sidebarClass = isOpen
    ? "translate-x-0 opacity-100"
    : "-translate-x-full opacity-0 pointer-events-none";

  return (
    <div
      className={`fixed md:relative z-30 md:z-10 w-72 bg-white dark:bg-gray-800 shadow-lg flex flex-col h-screen transition-all duration-300 ease-in-out ${sidebarClass}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
            Question Bank
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              {orderedQuestions.length}
            </span>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-full hover:bg-gray-100"
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content area with drag bounds */}
      <div className="flex-1 min-h-0 flex flex-col">
        {orderedQuestions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <p>No questions created yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Questions will appear here as you create them
              </p>
            </div>
          </div>
        ) : (
          <div className="relative flex-1">
            {/* Scroll container */}
            <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              <div className="p-4">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                >
                  <SortableContext
                    items={orderedQuestions.map((q) => q.questionId)}
                    strategy={verticalListSortingStrategy}
                  >
                    {orderedQuestions.map((question) => (
                      <SortableQuestion
                        key={question.questionId}
                        id={question.questionId}
                        question={question}
                        onQuestionPreview={onQuestionPreview}
                        activeQuestionId={activeQuestionId}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={orderedQuestions.length === 0}
          //onClick={submitToDatabase}
          onClick={() => setShowQuizNameModal(true)}
        >
          <span>Submit All Questions</span>
        </button>
      </div>
    </div>
  );
};

// Question Preview Component
const QuestionPreview = ({
  question,
  onBack,
  setActiveQuestionId,
}: {
  question: Question;
  onBack: () => void;
  setActiveQuestionId: (id: string | null) => void;
}) => {
  const questions = useAppSelector((state) => state.questions.questions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(
    () => {
      return questions.findIndex((q) => q.questionId === question.questionId);
    }
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Get current question from index
  const currentQuestion = questions[currentQuestionIndex] || question;

  useEffect(() => {
    // Update active question ID whenever current index changes
    setActiveQuestionId(currentQuestion.questionId);
  }, [currentQuestionIndex, currentQuestion.questionId]);

  const goToNextSlide = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goToPrevSlide = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goToNextSlide();
      } else if (e.key === "ArrowLeft") {
        goToPrevSlide();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentQuestionIndex]);

  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    // Update the current index whenever the question prop changes
    const newIndex = questions.findIndex(
      (q) => q.questionId === question.questionId
    );
    if (newIndex !== -1) {
      setCurrentQuestionIndex(newIndex);
    }
  }, [question, questions]);

  useEffect(() => {
    if (questions.length == 0) {
      onBack();
    }
  }, [questions]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* Improved header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Exit presentation mode"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-sm font-medium text-gray-500">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Main content area with improved layout */}

      <div className="flex-1 p-4 md:p-8 flex items-start justify-center h-full ">
        <div className="  w-full max-w-4xl h-full bg-white rounded-xl shadow-lg border border-gray-200 hover:border-blue-300 transition-colors md:p-8 relative">
          <div className="p-8">
            <QuestionLayout
              question={currentQuestion.currentQn}
              options={currentQuestion.options}
              correctAns={currentQuestion.correctAns}
              type={currentQuestion.type}
              Qn_id={currentQuestion.questionId}
              reviewMode={false}
            />
          </div>
        </div>
      </div>

      {/* Improved navigation arrows */}
      <div className="fixed left-4 right-4 top-1/2 transform -translate-y-1/2 flex justify-between pointer-events-none">
        <button
          onClick={goToPrevSlide}
          disabled={currentQuestionIndex === 0}
          className={`p-3 rounded-full bg-white shadow-lg hover:bg-gray-100 transition-all pointer-events-auto ${
            currentQuestionIndex === 0
              ? "opacity-0 cursor-not-allowed"
              : "opacity-80 hover:opacity-100 hover:shadow-xl"
          }`}
          aria-label="Previous question"
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Simplified slide indicators */}
      <div className="bg-white border-t border-gray-200  flex justify-center py-2 px-1">
        <div className="flex gap-2 items-center max-w-full overflow-x-auto px-4 py-1">
          {questions.map((q, index) => (
            <button
              key={q.questionId}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`flex items-center justify-center mb-6 rounded-full transition-all ${
                index === currentQuestionIndex
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
              style={{
                width: index === currentQuestionIndex ? "32px" : "24px",
                height: index === currentQuestionIndex ? "32px" : "24px",
              }}
              title={`Go to question ${index + 1}`}
            >
              <span className="text-xs font-medium">{index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const QuestionCreatorPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isQuestionSidebarOpen, setIsQuestionSidebarOpen] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("");
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const questions = useAppSelector((state) => state.questions.questions);
  const dispatch = useAppDispatch();

  const [showNewQuestionAlert, setShowNewQuestionAlert] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previousCount, setPreviousCount] = useState(questions.length);
  const [showQuizNameModal, setShowQuizNameModal] = useState(false);
  const [quizName, setQuizName] = useState("");
  const [quizes, setQuizes] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLiveQuizModal, setShowLiveQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  //const { addQuestionToDatabase } = useQuestions();

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        let res = await fetchAllTests();
        setQuizes(res);
        console.log(res)
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        // Optionally set an error state or handle the error
      }
    };

    fetchQuizzes();
  }, [isSubmitting]);

  const submitToDatabase = async () => {
    try {
      setIsSubmitting(true); // Set flag before submission

      await addQuestionInDatabase(questions, quizName);
      dispatch(clearQuestions());

      setSuccessMessage("Questions successfully added to the database!");
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowQuizNameModal(false);
    } catch (error) {
      console.error("Error submitting questions:", error);
    } finally {
      setIsSubmitting(false); // Reset flag after submission
    }
  };

  useEffect(() => {
    const handleResize = () => {
      const isLargeScreen = window.innerWidth >= 1024;
      setIsSidebarOpen(isLargeScreen);

      const isMediumScreen = window.innerWidth >= 768;
      setIsQuestionSidebarOpen(isMediumScreen);

      console.log("Screen resized:", {
        width: window.innerWidth,
        isSidebarOpen: isLargeScreen,
      });
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (questions.length > previousCount) {
      setShowNewQuestionAlert(true);
      setTimeout(() => {
        setShowNewQuestionAlert(false);
      }, 1000);
    }
    setPreviousCount(questions.length);
  }, [questions.length, previousCount]);

  const questionTypes = [
    {
      "Create Questions": [
        "Multiple Choice",
        "Short Answer",
        "True/False",
        "Dropdown",
        "Drag & Drop",
        "Fill In The Blank",
      ],
    },
  ];

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setPreviewQuestion(null); // Clear preview when switching types
  };

  const handleQuestionPreview = (question: Question) => {
    setPreviewQuestion(question);
    setActiveQuestionId(question.questionId);
    // When previewing a question, clear the selected question type
    setSelectedType("");
  };

  const handleDeleteTest = async (quizId: string) => {
    const result = await deleteTest(quizId);

    if (result.success) {
      // Update local state to remove the deleted test
      setQuizes((prevQuizes) =>
        prevQuizes.filter((quiz: any) => quiz._id !== quizId)
      );

      // Show success message
      //setSuccessMessage(result.message);
    } else {
      // Handle error
      console.error(result.message);
    }
  };

  const renderContent = () => {
    // If a question is being previewed, show the preview
    if (previewQuestion) {
      return (
        <QuestionPreview
          question={previewQuestion}
          onBack={() => setPreviewQuestion(null)}
          setActiveQuestionId={setActiveQuestionId}
        />
      );
    }

    const QuestionTypeWrapper = ({
      children,
      title,
    }: {
      children: React.ReactNode;
      title: string;
    }) => (
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="flex items-center mb-4 space-x-4">
          <button
            onClick={() => setSelectedType("")}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Back to question types"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {title}
          </h2>
        </div>
        {children}
      </div>
    );

    switch (selectedType) {
      case "Multiple Choice":
        return (
          <QuestionTypeWrapper title="Create Multiple Choice Question">
            <CheckBoxQuizComponent />
          </QuestionTypeWrapper>
        );
      case "Short Answer":
        return (
          <QuestionTypeWrapper title="Create Short Answer Question">
            <ShortAnswerComponent />
          </QuestionTypeWrapper>
        );
      case "True/False":
        return (
          <QuestionTypeWrapper title="Create True/False Question">
            <RadioQuizComponent />
          </QuestionTypeWrapper>
        );
      case "Dropdown":
        return (
          <QuestionTypeWrapper title="Create Dropdown Question">
            <DropDownComponent />
          </QuestionTypeWrapper>
        );
      case "Drag & Drop":
        return (
          <QuestionTypeWrapper title="Create Drag & Drop Question">
            <DndComponent />
          </QuestionTypeWrapper>
        );
      case "Fill In The Blank":
        return (
          <QuestionTypeWrapper title="Create Fill In The Blank Question">
            <FillInTheBlankComponent />
          </QuestionTypeWrapper>
        );
      default:
        return (
          <div className="w-full min-h-screen flex flex-col">
            {quizes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                {quizes.map((quiz: any, index) => {
                  // Array of vibrant color combinations
                  const colorSchemes = [
                    {
                      bg: "bg-blue-100",
                      text: "text-blue-800",
                      border: "border-blue-300",
                    },
                    {
                      bg: "bg-green-100",
                      text: "text-green-800",
                      border: "border-green-300",
                    },
                    {
                      bg: "bg-purple-100",
                      text: "text-purple-800",
                      border: "border-purple-300",
                    },
                    {
                      bg: "bg-pink-100",
                      text: "text-pink-800",
                      border: "border-pink-300",
                    },
                    {
                      bg: "bg-yellow-100",
                      text: "text-yellow-800",
                      border: "border-yellow-300",
                    },
                    {
                      bg: "bg-indigo-100",
                      text: "text-indigo-800",
                      border: "border-indigo-300",
                    },
                  ];

                  // Cycle through color schemes
                  const colorScheme = colorSchemes[index % colorSchemes.length];

                  return (
                    <div
                      key={quiz._id}
                      className={`
                        ${colorScheme.bg} ${colorScheme.text} ${colorScheme.border}
                        p-6 rounded-lg shadow-md border
                        transform transition-all duration-300
                        hover:scale-105 hover:shadow-xl
                        relative
                      `}
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold">
                          {quiz.quizName || "Unnamed Quiz"}
                        </h3>
                        
                        <button
                          onClick={() => handleDeleteTest(quiz._id)}
                          className="text-red-500 hover:bg-red-200 rounded-full p-1 absolute top-2 right-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        
                        <span className="bg-white/50 px-3 py-1 rounded-full text-sm">
                          {quiz.questions?.length || 0} Questions
                        </span>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <button
                          className={`
                            px-3 py-1 text-sm rounded-md
                            ${colorScheme.text} bg-white/70
                            hover:bg-white font-medium
                            transition-colors duration-300
                          `}
                          onClick={() => {
                            setSelectedQuiz(quiz);
                            setShowLiveQuizModal(true);
                          }}
                        >
                          Start Quiz
                        </button>
                        <Link
                          href={`/results?quizName=${encodeURIComponent(quiz.quizName)}&quizId=${encodeURIComponent(quiz.quiz_id || '')}`}
                          className={`
                            px-3 py-1 text-sm rounded-md
                            ${colorScheme.text} bg-white/70
                            hover:bg-white font-medium
                            transition-colors duration-300
                          `}
                        >
                          See Responses
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-grow flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md border border-gray-200 dark:border-gray-700 text-center">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    Select a Question Type
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    Choose a question type from the sidebar to start creating a
                    new question.
                  </p>
                </div>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-gray-900">
      {/* Question Sidebar (hidden on small screens) */}
      <ViewQuestionsSidebar
        onQuestionPreview={handleQuestionPreview}
        activeQuestionId={activeQuestionId}
        setSuccessMessage={setSuccessMessage}
        isOpen={isQuestionSidebarOpen}
        onClose={() => setIsQuestionSidebarOpen(false)}
        submitToDatabase={submitToDatabase}
        setShowQuizNameModal={setShowQuizNameModal}
      />

      <main
        className={`flex-1 ${
          previewQuestion ? "overflow-hidden" : "overflow-auto"
        }`}
      >
        {/* New Question Alert - Positioned at the very top */}
        {showNewQuestionAlert && !previewQuestion && (
          <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-6 py-4 rounded-md border border-green-400 shadow-lg z-50">
            <div className="max-w-4xl mx-auto">
              <p className="text-green-800">
                Question added successfully! Total questions: {questions.length}
              </p>
            </div>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-6 py-4 rounded-md border border-green-400 shadow-lg z-50">
            {successMessage}
          </div>
        )}

        {/* Toggle Button for Mobile */}
        {/* Fixed position sidebar toggle buttons */}
        <div className="fixed bottom-6 left-0 right-0 px-6 flex z-20">
          {/* Left sidebar toggle (Question Bank) */}
          <button
            onClick={() => setIsQuestionSidebarOpen(true)}
            className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors md:hidden"
            aria-label="Open question bank"
          >
            <PanelLeft className="w-6 h-6" />
          </button>

          {/* Spacer that pushes the right button to the end */}
          <div className="flex-1"></div>

          {/* Video Quiz Button */}

          {/* Right sidebar toggle (Main Menu) */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <PanelRight className="w-6 h-6" />
          </button>
        </div>

        {renderContent()}

        <LiveQuizModal
          isOpen={showLiveQuizModal}
          onClose={() => setShowLiveQuizModal(false)}
          quiz={selectedQuiz || { _id: "", quizName: "", questions: [] }}
        />

        {/* Quiz Name Modal */}
        <QuizNameModal
          isOpen={showQuizNameModal}
          quizName={quizName}
          setQuizName={setQuizName}
          onClose={() => setShowQuizNameModal(false)}
          onSubmit={submitToDatabase}
        />
      </main>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        items={questionTypes}
        title="Question Creator"
        titleIcon={<Book className="w-6 h-6 text-blue-500" />}
        selectedItemId={selectedType}
        onSelectItem={handleTypeSelect}
        itemIcon={
          <Tooltip title="Question Type">
            <HelpCircle className="w-4 h-4 text-gray-500 cursor-pointer" />
          </Tooltip>
        }
      />
    </div>
  );
};

export default QuestionCreatorPage;
