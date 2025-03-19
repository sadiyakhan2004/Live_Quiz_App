import { NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect"; // Your DB connection function
import Quiz from "@/models/Quiz"; // Your Mongoose Quiz model

export async function POST(req: Request) {
  try {
    await connectDB();
    
    const { quizName, quizId, quizCode, questionIds, timeLimit, waitingTime, showAnswers } = await req.json();
    
    // Create a new quiz without deleting existing ones
    const newQuiz = new Quiz({
      quizName,
      quizId,
      quizCode,
      questionIds,
      timeLimit,
      waitingTime: waitingTime || 5,
      showAnswers: showAnswers || false
    });
    
    await newQuiz.save();
    
    return NextResponse.json({ message: "Quiz stored successfully", quiz: newQuiz }, { status: 200 });
  } catch (error) {
    console.error("Quiz storage error:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    
    // Extract quizCode from URL parameters
    const url = new URL(req.url);
    const quizCode = url.searchParams.get('quizCode');
    
    if (!quizCode) {
      return NextResponse.json({ error: "Quiz code is required" }, { status: 400 });
    }
    
    // Fetch quiz by quizCode
    const quiz = await Quiz.findOne({ quizCode });
    
    if (!quiz) {
      return NextResponse.json({ error: "No quiz found with the provided code" }, { status: 404 });
    }
    
    return NextResponse.json(quiz, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}