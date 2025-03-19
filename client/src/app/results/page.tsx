// app/results/page.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import QuizResults from '@/components//helperComponents/QuizResults';

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const quizName = searchParams.get('quizName') || '';
  const quizCode = searchParams.get('quizCode') || '';
  const quizId = searchParams.get('quizId') || '';
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Quiz Results Dashboard</h1>
      <QuizResults quizName={quizName} quizCode={quizCode} quizId={quizId} />
    </div>
  );
}