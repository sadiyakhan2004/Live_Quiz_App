
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import { Test } from "@/models/Test";
import { Question } from "@/models/Question";
import { Response } from "@/models/Response";
import Quiz from "@/models/Quiz";

export async function GET(request: NextRequest) {
  try {
    // Ensure database connection
    await connectDB();

    // Fetch all tests from the database
    const tests = await Test.find({});

    // Return successful response with tests
    return NextResponse.json({
      success: true,
      count: tests.length,
      data: tests
    }, { status: 200 });

  } catch (error) {
    // Handle any errors during the fetch process
    console.error("Error fetching tests:", error);

    return NextResponse.json({
      success: false,
      message: "Unable to fetch tests"
    }, { status: 500 });
  }
}


export async function DELETE(
    request: NextRequest
  ) {
    try {
      // Connect to database
      await connectDB();
  
      // Extract quizId from search params
      const { searchParams } = new URL(request.url);
      const quizId = searchParams.get('quizId');
  
      if (!quizId) {
        return NextResponse.json({ 
          message: 'Quiz ID is required' 
        }, { status: 400 });
      }
  
      // Find the test to be deleted
      const test = await Test.findById(quizId);
  
      if (!test) {
        return NextResponse.json({ 
          message: 'Test not found' 
        }, { status: 404 });
      }
  
      // Delete associated questions
      await Question.deleteMany({ _id: { $in: test.questions } });
  
      // Delete associated responses
      await Response.deleteMany({ quizId: test._id });

      // Delete associated quizzes
      await Quiz.deleteMany({ quizId: test._id });
  
      // Delete the test itself
      await Test.findByIdAndDelete(quizId);
  
      return NextResponse.json({ 
        message: 'Test and associated data deleted successfully',
        data: test
      }, { status: 200 });
  
    } catch (error) {
      console.error('Error in delete test route:', error);
      return NextResponse.json({ 
        message: 'Error deleting test',
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  }