import React, { useEffect, useState } from 'react';

// Timer component with progressive warning
 export const QuizTimer = ({ 
  timeLeft, 
  totalTime, 
  warningThreshold = 5 
}: { 
  timeLeft: number, 
  totalTime: number, 
  warningThreshold?: number 
}) => {
  const [isWarning, setIsWarning] = useState(false);
  const [warningFlash, setWarningFlash] = useState(false);

  // Calculate the stroke dasharray and offset for the circular timer
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - timeLeft / totalTime);

  // Warning and flashing logic
  useEffect(() => {
    let warningInterval: NodeJS.Timeout;

    if (timeLeft <= warningThreshold) {
      setIsWarning(true);
      warningInterval = setInterval(() => {
        setWarningFlash(prev => !prev);
      }, 500); // Toggle every 500ms
    } else {
      setIsWarning(false);
      setWarningFlash(false);
    }

    return () => {
      if (warningInterval) clearInterval(warningInterval);
    };
  }, [timeLeft, warningThreshold]);

  return (
    <div 
      className={`
        relative w-24 h-24 flex items-center justify-center
        ${isWarning ? (warningFlash ? 'bg-red-100' : 'bg-white') : 'bg-white'}
        rounded-full transition-colors duration-300
      `}
    >
      <svg width="100" height="100" className="absolute top-0 left-0">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={isWarning ? "#FF4444" : "#6366F1"}
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-100 ease-linear"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%'
          }}
        />
      </svg>
      <span 
        className={`
          text-3xl font-bold 
          ${isWarning ? 'text-red-600' : 'text-indigo-600'}
          z-10 relative
        `}
      >
        {timeLeft}
      </span>
    </div>
  );
};
