import React, {
  useState,
  useEffect,
  useRef,
  ChangeEvent,
  FocusEvent,
} from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  name?: string;
  placeholder?: string;
  isFocus?: boolean;
  disabled?: boolean;
  label?: string;
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
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({
  type = "text",
  value = "",
  onChange = () => {},
  required = false,
  name = "",
  placeholder = "",
  isFocus = false,
  disabled = false,
  label = "Label",
  className = "",
  labelClassName = "w-auto",
  focusedLabelClassName = "",
  containerClassName = "",
  focusColor = "#0790e8",
  borderColor = "currentColor",
  backgroundColor = "white",
  darkBackgroundColor = "black",
  padding = "0.5rem",
  width = "full",
  transitionDuration = "300",
  onFocus = () => {},
  onBlur = () => {},
  ...props
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(isFocus);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocus]);

  const handleFocus = (e: FocusEvent<HTMLInputElement>): void => {
    setIsFocused(true);
    onFocus(e);
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>): void => {
    setIsFocused(value !== "");
    onBlur(e);
  };

  return (
    <div
      className={cn(
        "relative my-2 text-gray-600",
        {
          "w-full": width === "full",
          [`w-${width}`]: width !== "full",
        },
        containerClassName
      )}
    >
      <input
        ref={inputRef}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        name={name}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "w-full p-2",
          "border-2 rounded-lg border-opacity-50",
          "outline-none duration-300",
          {
            "border-blue-500": isFocused,
            "border-gray-300": !isFocused,
          },
          className
        )}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      />
      <label
        className={cn(
          "absolute",
          "flex items-center justify-center",
          "top-5 left-2",
          "text-sm",
          "transform -translate-y-1/2",
          "text-opacity-80",
          "px-1",
          "pointer-events-none",
          {
            [`duration-${transitionDuration}`]: transitionDuration,
          },
          {
            "top-[-2px]": isFocused,
            [`bg-${backgroundColor}`]: isFocused,
            [`dark:bg-${darkBackgroundColor}`]: isFocused,
            "w-10": isFocused,
            "text-sm": isFocused,
            "text-blue-500": isFocused,
          },
          labelClassName,
          isFocused && focusedLabelClassName
        )}
      >
        {label}
      </label>
    </div>
  );
};

export default Input;
