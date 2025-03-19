import { NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import { Question } from "@/models/Question";
import { Test } from "@/models/Test";
import { v4 as uuidv4 } from "uuid";

// Fetch all questions
export async function GET(req: Request) {
  await connectDB();

  // Extract quiz name from query parameters
  const { searchParams } = new URL(req.url);
  const quizName = searchParams.get('quizName');

  try {
    // If quiz name is provided, fetch questions for that specific quiz
    if (quizName) {
      // Find the test with the given quiz name
      const test = await Test.findOne({ quizName }).populate('questions');

      if (!test) {
        return NextResponse.json({ 
          error: `No test found with quiz name: ${quizName}` 
        }, { status: 404 });
      }

      // Return the populated questions
      return NextResponse.json(test.questions);
    }

    // If no quiz name, fetch all questions
    const questions = await Question.find();
    return NextResponse.json(questions);
  } catch (error: any) {
    console.error("Error fetching questions:", error);
    return NextResponse.json({ 
      error: error.message 
    }, { status: 400 });
  }
}

// Add multiple questions
export async function POST(req: Request) {
  await connectDB(); 
  try {
    const { questions, quizName } = await req.json(); // Parse JSON body

    if (!Array.isArray(questions) || !quizName) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
    }

    // Insert questions into the database
    const savedQuestions = await Question.insertMany(questions);
    const questionIds = savedQuestions.map(q => q._id); // Extract question IDs

    // Check if a test with the same quizName exists
    let test = await Test.findOne({ quizName });

    if (test) {
      // Update existing test by adding new question IDs
      test.questions.push(...questionIds);
      await test.save();
    } else {
      // Create a new test entry with a unique quizId
      test = new Test({ quizId: uuidv4(), quizName, questions: questionIds });
      await test.save();
    }

    return NextResponse.json({ test, savedQuestions }, { status: 201 });
  } catch (error: any) {
    console.error("MongoDB Error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// Update user's answer
export async function PUT(req: Request) {
  await connectDB();
  const { questionId, userAns } = await req.json();
  await Question.findOneAndUpdate({ questionId }, { userAns });
  return NextResponse.json({ message: "Answer updated" });
}

// Delete a specific question
export async function DELETE(req: Request) {
  await connectDB();
  const { questionId } = await req.json(); // Extract questionId from request body
  await Question.findOneAndDelete({ questionId });

  return NextResponse.json({ message: "Question deleted" }, { status: 200 });
}
