import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FocusEvent,
} from "react";
import { cn } from "@/lib/utils";

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
  name?: string;
  placeholder?: string;
  isFocus?: boolean;
  disabled?: boolean;
  label?: string;
  textareaClassName?: string;
  labelClassName?: string;
  focusedLabelClassName?: string;
  containerClassName?: string;
  focusColor?: string;
  borderColor?: string;
  backgroundColor?: string;
  darkBackgroundColor?: string;
  padding?: string;
  width?: string;
  transitionDuration?: string;
  rows?: number;
  onFocus?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
}

const TextArea: React.FC<TextAreaProps> = ({
  value = "",
  onChange = () => {},
  required = false,
  name = "",
  placeholder = "",
  isFocus = false,
  disabled = false,
  label = "Label",
  className = "",
  textareaClassName = "",
  labelClassName = "",
  focusedLabelClassName = "",
  containerClassName = "",
  focusColor = "#0790e8",
  borderColor = "currentColor",
  backgroundColor = "white",
  darkBackgroundColor = "black",
  padding = "0.5rem",
  width = "full",
  transitionDuration = "300ms",
  rows = 4,
  onFocus = () => {},
  onBlur = () => {},
  ...props
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(isFocus);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFocus]);

  const handleFocus = (e: FocusEvent<HTMLTextAreaElement>): void => {
    setIsFocused(true);
    onFocus(e);
  };

  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>): void => {
    setIsFocused(value !== "");
    onBlur(e);
  };

  return (
    <div
      className={cn(
        "relative my-2 text-gray-600",
        width === "full" ? "w-full" : `w-${width}`,
        containerClassName
      )}
    >
      <textarea
        ref={textareaRef}
        required={required}
        value={value}
        onChange={onChange}
        name={name}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        className={cn(
          "w-full",
          "p-2",
          "border-2",
          "rounded-lg",
          "border-opacity-50",
          "outline-none",
          "resize-y",
          "duration-300",
          isFocused ? "border-blue-500" : "border-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
          textareaClassName
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      <label
        className={cn(
          "absolute",
          "w-auto",
          "flex",
          "items-center",
          "justify-center",
          "top-5",
          "left-2",
          "text-sm",
          "transform",
          "-translate-y-1/2",
          "text-opacity-80",
          "px-1",
          "transition-all",
          `duration-${transitionDuration}`,
          "pointer-events-none",
          isFocused && [
            "top-[-2px]",
            `bg-${backgroundColor}`,
            `dark:bg-${darkBackgroundColor}`,
            "w-10",
            "text-sm",
            "text-blue-500",
            focusedLabelClassName,
          ],
          labelClassName
        )}
      >
        {label}
      </label>
    </div>
  );
};

export default TextArea;
