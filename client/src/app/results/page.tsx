// app/results/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import QuizResults from "@/components//helperComponents/QuizResults";

import { useSocket } from "@/context/SocketProvider";

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const socket = useSocket();
  const quizName = searchParams.get("quizName") || "";
  const quizCode = searchParams.get("quizCode") || "";
  const quizId = searchParams.get("quizId") || "";

  return (
    <div className="container mx-auto px-4 py-8">
      <QuizResults quizName={quizName} quizCode={quizCode} quizId={quizId} />
    </div>
  );
}
