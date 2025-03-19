import React, { useState, useRef, useEffect, ReactNode } from "react";

interface TooltipProps {
  children: React.ReactNode;
  title: string | ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
  className?: string;
  tooltipClassName?: string;
}

const Tooltip = ({
  children,
  title,
  position = "top",
  delay = 200,
  className = "",
  tooltipClassName = "",
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  let timeoutId: NodeJS.Timeout;

  const calculatePosition = () => {
    if (!tooltipRef.current || !targetRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8; // Space between target and tooltip

    let top = 0;
    let left = 0;

    switch (position) {
      case "top":
        top = targetRect.top - tooltipRect.height - spacing;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case "bottom":
        top = targetRect.bottom + spacing;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case "left":
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - spacing;
        break;
      case "right":
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + spacing;
        break;
    }

    // Prevent tooltip from going outside viewport
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Adjust horizontal position
    if (left < 0) {
      left = spacing;
    } else if (left + tooltipRect.width > viewport.width) {
      left = viewport.width - tooltipRect.width - spacing;
    }

    // Adjust vertical position
    if (top < 0) {
      top = spacing;
    } else if (top + tooltipRect.height > viewport.height) {
      top = viewport.height - tooltipRect.height - spacing;
    }

    setTooltipPosition({ top, left });
  };

  const handleMouseEnter = () => {
    timeoutId = setTimeout(() => {
      setIsVisible(true);
      // Wait for next frame to calculate position after tooltip is rendered
      requestAnimationFrame(calculatePosition);
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(timeoutId);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener("scroll", calculatePosition);
      window.addEventListener("resize", calculatePosition);
    }

    return () => {
      window.removeEventListener("scroll", calculatePosition);
      window.removeEventListener("resize", calculatePosition);
    };
  }, [isVisible]);

  const getArrowClass = () => {
    switch (position) {
      case "top":
        return "bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-800 border-x-transparent border-b-transparent";
      case "bottom":
        return "top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-800 border-x-transparent border-t-transparent";
      case "left":
        return "right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent";
      case "right":
        return "left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent";
    }
  };

  return (
    <div
      ref={targetRef}
      className={`inline-block relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 transform transition-opacity duration-200 ease-in-out ${
            isVisible ? "opacity-100" : "opacity-0"
          } ${tooltipClassName}`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
        >
          <div className="relative">
            <div className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm whitespace-nowrap shadow-lg transform transition-all duration-200 ease-in-out scale-100 hover:scale-[1.02]">
              {title}
            </div>
            <div
              className={`absolute w-0 h-0 border-4 ${getArrowClass()}`}
              aria-hidden="true"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
