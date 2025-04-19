"use client";
import { useState, useEffect, ReactNode, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { addQuestion } from "@/store/features/questionSlice";
import {
  updateResponse,
  isAnswerCorrect,
  localResponses,
} from "@/controllers/response";
import { v4 as uuidv4 } from "uuid";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Tooltip from "../ui/Tooltip";
import { AlertCircle, Minus, Plus } from "lucide-react";
import Textarea from "../ui/Textarea";
// Import dnd-kit components
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import type { Modifier } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface Question {
  heading: string;
  paras: string[];
}

export interface QuestionData {
  questionId: string;
  currentQn: Question;
  options?: string[];
  correctAns: string | string[];
  type:
    | "checkbox"
    | "radio"
    | "short-answer"
    | "fill-in-the-blank"
    | "dropdown"
    | "dnd";
}

interface DragDropQuizProps {
  question?: {
    heading?: string;
    paras?: string[];
  };
  options?: string[];
  correctAns?: string;
  Qn_id?: string;
  reviewMode?: boolean;
  onAnswered?: () => void;
}

interface DraggableOptionProps {
  option: string;
  isDisabled: boolean;
  isHighlighted: boolean;
}

interface DroppableFieldProps {
  children: ReactNode;
  minWidth?: number;
}

// Draggable Option Component
const DraggableOption: React.FC<DraggableOptionProps> = ({
  option,
  isDisabled,
  isHighlighted,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: option,
      disabled: isDisabled,
    });

  const minWidth = Math.max(option.length * 15, 80);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab bg-gray-500  border border-gray-600 text-white text-center px-4 py-2 rounded-md hover:bg-gray-600 inline-block
        ${isDisabled ? "opacity-50 cursor-not-allowed" : ""} 
        ${isHighlighted ? "ring-2 ring-blue-400 bg-gray-600" : ""}
        ${isDragging ? "shadow-md opacity-100" : ""}`}
      style={{
        touchAction: "none", // Critical for touch devices
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
        transition: isDragging ? "none" : "transform 0.1s",
        minWidth: `${minWidth}px`,
        width: "auto",
        maxWidth: "200px",
      }}
    >
      {option}
    </div>
  );
};

const DraggableAnswer: React.FC<{ answer: string; onReset: () => void }> = ({
  answer,
  onReset,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `field-${answer}`, // Prefix to identify this is from field
    });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 100 : 100,
    zIndex: isDragging ? 1000 : 0,
  };

  return (
    <span
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full h-full cursor-grab text-white text-center rounded-md flex items-center justify-center bg-gray-500 
        transition-all duration-75 ${
          isDragging ? "shadow-md " : ""
        } hover:bg-gray-600`}
      style={style}
      onClick={!isDragging ? onReset : undefined}
    >
      {answer}
    </span>
  );
};

// Droppable Field Component
const DroppableField: React.FC<DroppableFieldProps> = ({
  children,
  minWidth = 80,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "droppable-field",
  });

  return (
    <span
      ref={setNodeRef}
      className={`inline-flex items-center justify-center w-auto min-w-[${minWidth}px] max-w-[200px] mt-2 h-10 
        ${
          isOver
            ? "bg-blue-100 border-2 border-blue-400"
            : "bg-gray-200 border-2 border-gray-300"
        } 
        rounded-md mx-1 my-1 transition-all duration-75`}
      style={{
        minWidth: `${minWidth}px`,
        maxWidth: "200px",
        width: "auto",
      }}
    >
      {children ||
        (isOver ? (
          <span className="text-blue-500 font-medium text-sm"></span>
        ) : (
          <span className="text-gray-400 text-xs">__________</span>
        ))}
    </span>
  );
};

// Create a droppable area for returning options to the options area
const OptionDropSlot: React.FC<{
  optionId: string;
  children: ReactNode;
  isVisible: boolean;
}> = ({ optionId, children, isVisible }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `option-slot-${optionId}`, // Unique ID for each option slot
  });

  return (
    <div
      ref={setNodeRef}
      className={`inline-block transition-all duration-75 rounded-md 
        ${isOver ? "bg-gray-100/60 border border-dashed" : ""}
        ${!isVisible && isOver ? "bg-gray-100 border border-gray-400" : ""}`}
    >
      {children}
    </div>
  );
};

const DragDropQuizComponent: React.FC<DragDropQuizProps> = ({
  question,
  options = [],
  correctAns = "",
  Qn_id,
  reviewMode = false,
  onAnswered,
}) => {
  const dispatch = useAppDispatch();
  const [droppedAnswer, setDroppedAnswer] = useState<string>("");
  const [availableOptions, setAvailableOptions] = useState<string[]>(options);
  const [highlightedOption, setHighlightedOption] = useState<string | null>(
    null
  );
  const [isDraggingFromField, setIsDraggingFromField] = useState(false);
  const [attemptedDragWhileOccupied, setAttemptedDragWhileOccupied] =
    useState(false);

  // State for validation errors
  const [errors, setErrors] = useState({
    questionContent: false, // Combined error for heading/subheading/content
    options: false,
    correctAns: false,
    fieldMarker: false,
    correctAnsInOptions: false,
  });

  // State for showing error messages
  const [showErrors, setShowErrors] = useState(false);

  // Function to check if any content contains the {field} marker
  const hasFieldMarker = () => {
    const headingHasField = newQuestion.heading.includes("{field}");
    const parasHasField = newQuestion.paras.some((para) =>
      para.includes("{field}")
    );

    return headingHasField || parasHasField;
  };

  // Function to check if correct answer is included in options
  const isCorrectAnsInOptions = () => {
    return currentOptions.some(
      (option) => option.trim() === currentCorrectAns.trim()
    );
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

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 1, // Very small distance to activate
        delay: 0, // No delay in activation
        tolerance: 5, // Small movement tolerance
      },
    }),
    useSensor(KeyboardSensor)
  );
  //states for creation mode
  const [newQuestion, setNewQuestion] = useState<Question>({
    heading: "",
    paras: [""],
  });
  const [currentOptions, setCurrentOptions] = useState([""]);
  const [currentCorrectAns, setCurrentCorrectAns] = useState(correctAns || "");

  const isQuizMode = question && options && correctAns;

  useEffect(() => {
    if (isQuizMode) {
      const res = localResponses.find((res: any) => res.questionId === Qn_id);
      if (res?.userAns && Qn_id) {
        const userAnswer = Array.isArray(res.userAns)
          ? res.userAns[0]
          : res.userAns;
        setDroppedAnswer(userAnswer);
        // Remove the dropped answer from available options
        setAvailableOptions(options.filter((opt) => opt !== userAnswer));
      } else {
        setAvailableOptions([...options]);
      }
    }
  }, [Qn_id, isQuizMode, options, reviewMode]);

  // Handle drag end event from dnd-kit
  const handleDragStart = (event: any) => {
    const { active } = event;

    // Reset the attempted drag state
    setAttemptedDragWhileOccupied(false);

    if (active.id.toString().startsWith("field-")) {
      setIsDraggingFromField(true);
      // Highlight the original option slot
      const originalOption = active.id.toString().replace("field-", "");
      setHighlightedOption(originalOption);
    } else {
      setIsDraggingFromField(false);
      setHighlightedOption(null);

      // If there's already an option in the field, set the flag
      if (droppedAnswer) {
        setAttemptedDragWhileOccupied(true);
      }
    }
  };

  // Handle drag end for both directions
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset highlighting
    setHighlightedOption(null);
    setIsDraggingFromField(false);

    // If trying to drag new option while field is occupied, don't allow the drop
    if (attemptedDragWhileOccupied) {
      setAttemptedDragWhileOccupied(false);
      return;
    }

    // If dragging an option to the field
    if (
      over &&
      over.id === "droppable-field" &&
      !active.id.toString().startsWith("field-")
    ) {
      const draggedOption = active.id as string;

      // Return any previously dropped answer to available options
      if (droppedAnswer && !availableOptions.includes(droppedAnswer)) {
        setAvailableOptions((prev) => [...prev, droppedAnswer]);
      }

      // Set the new dropped answer
      setDroppedAnswer(draggedOption);

      // Remove the option from the available options
      setAvailableOptions(
        availableOptions.filter((opt) => opt !== draggedOption)
      );

      if (Qn_id) {
        updateResponse(Qn_id, draggedOption);
        onAnswered?.();
      }
    }

    // If dragging from field back to its original option slot
    if (
      over &&
      over.id.toString().startsWith("option-slot-") &&
      active.id.toString().startsWith("field-")
    ) {
      const originalOption = active.id.toString().replace("field-", "");
      const targetSlot = over.id.toString().replace("option-slot-", "");

      // Only allow dropping to the matching slot
      if (originalOption === targetSlot) {
        setDroppedAnswer("");

        // Add the option back to available options
        if (!availableOptions.includes(originalOption)) {
          setAvailableOptions([...availableOptions, originalOption]);
        }

        if (Qn_id) {
          updateResponse(Qn_id, "");
        }
      }
    }
  };

  // Handle reset of dropped answer (click functionality)
  const handleResetAnswer = () => {
    if (droppedAnswer) {
      // Add the option back to available options
      if (!availableOptions.includes(droppedAnswer)) {
        setAvailableOptions([...availableOptions, droppedAnswer]);
      }

      setDroppedAnswer("");

      if (Qn_id) {
        updateResponse(Qn_id, "");
      }
    }
  };

  // Function to get styles for answer (correct/incorrect)
  const getAnswerStyle = (userAnswer: string) => {
    //const Question = questions.find((q) => q.questionId === Qn_id);
    //if (!Question) return "border-2 border-gray-300";

    const { status, correctAns, userAns } = isAnswerCorrect(Qn_id);

    if (reviewMode) {
      if (status) {
        return "border-2 border-green-400 text-green-800";
      } else {
        return "border-2 border-red-400 text-red-800";
      }
    }

    return "border-2 border-gray-300"; // Default style
  };

  const renderWithField = (text: string) => {
    // For review mode
    if (reviewMode && Qn_id) {
      const res = localResponses.find((res) => res.questionId === Qn_id);
      const userAnswer = res?.userAns;
      const answerToDisplay = Array.isArray(userAnswer)
        ? userAnswer.join(", ")
        : userAnswer || "";

      return (
        <span className="text-lg font-semibold text-gray-600 dark:text-gray-200 py-4">
          <span className="flex-col items-end">
            {text.split("{field}").map((part, index) => (
              <span key={index} className="inline-flex items-center">
                {part}
                {/* Render dynamic field after the part */}
                {index < text.split("{field}").length - 1 && (
                  <span
                    className={`inline-flex items-center justify-center w-auto min-w-[80px] max-w-[200px] h-10 text-black text-center rounded-md mx-2 my-1 ${getAnswerStyle(
                      userAnswer as string
                    )}`}
                    style={{
                      width: `${Math.max(answerToDisplay.length * 15, 80)}px`,
                    }}
                  >
                    {answerToDisplay}
                  </span>
                )}
              </span>
            ))}
          </span>
        </span>
      );
    }

    // For non-review mode
    const parts = text.split("{field}") || [];

    // If there is no `{field}` in the text, return it as-is
    if (parts.length === 1) {
      return <span>{text}</span>;
    }

    return (
      <span className="text-lg font-semibold text-gray-600 dark:text-gray-300 py-4">
        <span className="flex-col items-end">
          {parts.map((part, index) => (
            <span key={index} className="inline-flex items-center">
              {part}
              {/* Render dynamic field after the part */}
              {index < parts.length - 1 && (
                <DroppableField
                  minWidth={Math.max((droppedAnswer?.length || 0) * 15, 80)}
                >
                  {droppedAnswer ? (
                    <DraggableAnswer
                      answer={droppedAnswer}
                      onReset={handleResetAnswer}
                    />
                  ) : null}
                </DroppableField>
              )}
            </span>
          ))}
        </span>
      </span>
    );
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

  const validateForm = () => {
    const hasContent = hasQuestionContent();
    const hasOptions = currentOptions.some((option) => option.trim() !== "");
    const hasCorrectAns = currentCorrectAns.trim() !== "";
    const hasField = hasFieldMarker();
    const correctAnsExists = isCorrectAnsInOptions();

    setErrors({
      questionContent: !hasContent,
      options: !hasOptions,
      correctAns: !hasCorrectAns,
      fieldMarker: !hasField,
      correctAnsInOptions: !correctAnsExists && hasCorrectAns, // Only show this error if a correct answer is provided
    });

    return (
      hasContent &&
      hasOptions &&
      hasCorrectAns &&
      hasField &&
      (correctAnsExists || !hasCorrectAns)
    );
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
      options: currentOptions,
      correctAns: currentCorrectAns,
      type: "dnd",
    };

    dispatch(addQuestion(newQuestionData)); // Add question to store

    // Reset form after submission
    setNewQuestion({ heading: "", paras: [""] });
    setCurrentOptions([""]);
    setCurrentCorrectAns("");

    setShowErrors(false);

    // Reset errors
    setErrors({
      questionContent: false,
      options: false,
      correctAns: false,
      fieldMarker: false,
      correctAnsInOptions: false,
    });
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

  const allOptions = [...options];
 const restrictToContainer = (containerRef: React.RefObject<HTMLElement>): Modifier => {
    return ({ transform, activeNodeRect }) => {
      if (!activeNodeRect || !containerRef.current) return transform;
  
      const containerRect = containerRef.current.getBoundingClientRect();
  
      const nodeWidth = activeNodeRect.width;
      const nodeHeight = activeNodeRect.height;
  
      const minX = containerRect.left;
      const maxX = containerRect.right - nodeWidth;
      const minY = containerRect.top;
      const maxY = containerRect.bottom - nodeHeight;
  
      const newX = activeNodeRect.left + transform.x;
      const newY = activeNodeRect.top + transform.y;
  
      const restrictedX = Math.max(minX - activeNodeRect.left, Math.min(transform.x, maxX - activeNodeRect.left));
      const restrictedY = Math.max(minY - activeNodeRect.top, Math.min(transform.y, maxY - activeNodeRect.top));
  
      return {
        ...transform,
        x: restrictedX,
        y: restrictedY,
      };
    };
  };

  const dragAreaRef = useRef<HTMLDivElement>(null);

  if (isQuizMode) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        modifiers={[restrictToContainer(dragAreaRef)]}
      >
        <div
          ref={dragAreaRef}
          className="bg-gray-100 dark:bg-gray-900 m-2 min-h-[400px] h-full p-8 rounded-md shadow-md space-y-2"
        >
          <div className="mb-6 w-full">
            {question?.heading && (
              <h4 className="text-xl text-bold text-gray-700 dark:text-gray-200">
                {renderWithField(question.heading)}
              </h4>
            )}
    
            {question?.paras?.map((para, i) => (
              <h4 key={i} className="text-lg text-gray-600 dark:text-gray-200 mt-2">
                {renderWithField(para)}
              </h4>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 mt-24 pt-4 rounded-xl">
            {allOptions.map((option, index) => {
              const isAvailable = availableOptions.includes(option);
    
              // Create drop slots for each option
              return (
                <OptionDropSlot
                  key={index}
                  optionId={option}
                  isVisible={isAvailable}
                >
                  {isAvailable ? (
                    <DraggableOption
                      option={option}
                      isDisabled={reviewMode}
                      isHighlighted={
                        option === highlightedOption && isDraggingFromField
                      }
                    />
                  ) : (
                    <div
                      className={`inline-flex items-center justify-center px-4 py-2 rounded-md min-h-[40px] border-2
                      ${
                        option === highlightedOption
                          ? "border-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30"
                          : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
                      }
                      transition-all duration-150`}
                      style={{
                        minWidth: `${Math.max(option.length * 15, 80)}px`,
                        maxWidth: "200px",
                        width: "auto",
                      }}
                    >
                      {option === highlightedOption ? (
                        <span></span>
                      ) : (
                        <span ></span>
                      )}
                    </div>
                  )}
                </OptionDropSlot>
              );
            })}
          </div>
        </div>
      </DndContext>
    );
  }

  // Form Creation Mode
  return (
    <div className="bg-white dark:bg-slate-900 p-8 rounded-lg shadow-lg w-full max-w-3xl border border-gray-200 dark:border-slate-800 transition-colors duration-300">
      <p className="mb-4 text-amber-500 dark:text-amber-400 font-medium italic">
        Use "{`{field}`}" to mark the drop option in the question.
      </p>

      {/* Question Section */}
      <div className="px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-blue-600 rounded-lg mb-6 transition-colors duration-300 shadow-md ">
        {/* Heading Input */}
        <div className="mb-4">
          <label className="block font-semibold text-blue-700 dark:text-blue-400 text-base mb-2">
            Write a Question
          </label>
          <Input
            type="text"
            value={newQuestion.heading}
            onChange={handleHeadingChange}
            className="w-full px-4 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
            label="Heading"
            focusedLabelClassName="text-blue-700 dark:text-blue-400"
            backgroundColor="bg-white dark:bg-slate-700"
            labelClassName="bg-white dark:bg-transparent"
          />
        </div>

        {/* Paragraphs Input */}
        <div className="mb-6">
          {newQuestion.paras.map((para, index) => (
            <div key={index} className="flex items-center gap-2 mb-3">
              <Textarea
                value={para}
                onChange={(e) => handleParaChange(index, e.target.value)}
                className="flex-1 w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
                label="Content"
                rows={1}
                focusedLabelClassName="text-blue-700 dark:text-blue-400"
                textareaClassName="bg-white dark:bg-slate-700 text-gray-800 dark:text-white"
                labelClassName="bg-white dark:bg-transparent"
              />
              {index > 0 && (
                <Tooltip title="Remove">
                  <Button
                    variant="outline"
                    onClick={() => removeParagraph(index)}
                    className="text-red-600 dark:text-red-400 border border-red-400 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md flex-shrink-0 transition-colors duration-300"
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
              className="text-green-600 dark:text-green-400 border border-green-500 dark:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-md flex items-center gap-1 mt-2 transition-colors duration-300"
            >
              <Plus />
            </Button>
          </Tooltip>

          <ErrorMessage
            show={errors.questionContent && showErrors}
            message="At least one field must be filled"
          />
          <ErrorMessage
            show={errors.fieldMarker && !errors.questionContent && showErrors}
            message="Question must include at least one {field} marker"
          />
        </div>
      </div>

      {/* Options Input */}
      <div className="mb-6 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-amber-400 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-amber-600 dark:text-amber-300 text-base mb-3">
          Specify Options
        </label>
        {currentOptions.map((option, index) => (
          <div key={index} className="flex items-center gap-2 mb-3 w-full">
            <div className="flex-1 relative w-full">
              <Input
                type="text"
                value={option}
                onChange={(e) => {
                  const updatedOptions = [...currentOptions];
                  updatedOptions[index] = e.target.value;
                  setCurrentOptions(updatedOptions);
                }}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:ring-amber-200 focus:border-amber-300 transition-all duration-300"
                label={`Option ${index + 1}`}
                backgroundColor="bg-white dark:bg-slate-700"
                focusedLabelClassName="text-amber-400 dark:text-amber-400 bg-white dark:bg-transparent"
              />
            </div>
            {index > 0 && (
              <Tooltip title="Remove">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentOptions(
                      currentOptions.filter((_, i) => i !== index)
                    )
                  }
                  className="text-red-600 dark:text-red-400 border border-red-400 dark:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md flex-shrink-0 transition-colors duration-300"
                >
                  <Minus size={20} />
                </Button>
              </Tooltip>
            )}
          </div>
        ))}
        <Tooltip title="Add Option" position="top" className="relative">
          <Button
            variant="outline"
            onClick={() => setCurrentOptions([...currentOptions, ""])}
            className="text-green-600 dark:text-green-400 border border-green-500 dark:border-green-500/50 hover:bg-green-50 dark:hover:bg-green-500/20 rounded-md flex items-center gap-1 mt-2 transition-colors duration-300"
          >
            <Plus size={20} />
          </Button>
        </Tooltip>

        <ErrorMessage
          show={errors.options && showErrors}
          message="At least one option is required"
        />
      </div>

      {/* Correct Answer Input */}
      <div className="mb-6 w-full px-6 py-5 bg-gray-50 dark:bg-slate-800 border-l-4 border-green-500 rounded-lg transition-colors duration-300 shadow-md">
        <label className="block font-semibold text-green-700 dark:text-green-400 text-base mb-3">
          Specify the Correct Answers
        </label>
        <Input
          type="text"
          value={currentCorrectAns}
          onChange={(e) => setCurrentCorrectAns(e.target.value)}
          className="w-full px-4 py-2 border rounded-md focus:ring-green-500 focus:border-green-500 dark:focus:border-green-500 bg-white dark:bg-slate-700 text-gray-800 dark:text-white transition-all duration-300"
          label="Correct Answer"
          focusedLabelClassName="text-green-700 dark:text-green-400 bg-white dark:bg-transparent"
          backgroundColor="bg-white dark:bg-slate-700"
        />
        <ErrorMessage
          show={errors.correctAns && showErrors}
          message="Correct answer is required"
        />
        <ErrorMessage
          show={errors.correctAnsInOptions && showErrors}
          message="Correct answer must be included in the options list"
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveQuestion}
          className="px-8 py-3 text-sm bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-medium rounded-md transition-colors duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Add Question
        </Button>
      </div>
    </div>
  );
};

export default DragDropQuizComponent;
