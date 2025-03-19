import { HTMLMotionProps } from "framer-motion";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "success"
  | "warning"
  | "danger"
  | "ghost"
  | "link";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

// Button.tsx
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[#0790e8] text-white hover:bg-[#0790e8]/90 dark:bg-[#0790e8] dark:hover:bg-[#0790e8]/80",
    "ripple-button" // Add specific class for primary buttons
  ),
  secondary:
    "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
  outline:
    "border-2 border-[#0790e8] text-[#0790e8] hover:bg-[#0790e8]/10 dark:text-[#0790e8] dark:hover:bg-[#0790e8]/20",
  success:
    "bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700",
  warning:
    "bg-amber-500 text-white hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600",
  danger:
    "bg-red-500 text-white hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600",
  ghost:
    "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  link: "text-[#0790e8] underline-offset-4 hover:underline dark:text-[#0790e8]",
};

const buttonSizes: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs rounded",
  sm: "h-9 px-3 text-sm rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-base rounded-md",
  xl: "h-12 px-8 text-lg rounded-lg",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      type = "button",
      disabled = false,
      loading = false,
      children,
      startIcon,
      endIcon,
      onClick,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const ExcludedRippleVarients = ["link", "outline", "ghost"];

    useEffect(() => {
      const button = buttonRef.current;
      if (!button || ExcludedRippleVarients.includes(variant)) return; // Only add ripple for primary variant

      const handleRipple = (e: MouseEvent) => {
        if (disabled || loading) return;

        const ripple = document.createElement("span");
        ripple.classList.add("ripple");

        button.appendChild(ripple);

        const rect = button.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        setTimeout(() => {
          ripple.remove();
        }, 600);
      };

      button.addEventListener("click", handleRipple);

      return () => {
        button.removeEventListener("click", handleRipple);
      };
    }, [disabled, loading, variant]); // Added variant to dependencies

    const buttonVariantsMotion = {
      initial: {
        opacity: 0,
      },
      animate: {
        opacity: 1,

        transition: {
          duration: 0.2,
          ease: "easeOut",
        },
      },
      exit: {
        opacity: 0,
        y: 10,
        transition: {
          duration: 0.2,
          ease: "easeIn",
        },
      },
      tap: {
        scale: 0.98,
      },
      hover: {
        scale: 1.02,
        transition: {
          duration: 0.2,
        },
      },
    };

    return (
      <motion.button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0790e8] focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          "relative overflow-hidden",
          "shadow-sm",
          buttonVariants[variant],
          buttonSizes[size],
          loading && "cursor-wait",
          className
        )}
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        disabled={disabled || loading}
        type={type}
        onClick={onClick}
        variants={buttonVariantsMotion}
        initial="initial"
        animate="animate"
        exit="exit"
        whileTap="tap"
        whileHover="hover"
        {...props}
      >
        {loading && (
          <motion.span
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            initial={{ rotate: 0 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </motion.span>
        )}

        <motion.span
          className={cn("flex items-center gap-2", loading && "invisible")}
          layout
        >
          {startIcon && (
            <motion.span
              className="shrink-0"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              {startIcon}
            </motion.span>
          )}
          {children}
          {endIcon && (
            <motion.span
              className="shrink-0"
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
            >
              {endIcon}
            </motion.span>
          )}
        </motion.span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export default Button;
