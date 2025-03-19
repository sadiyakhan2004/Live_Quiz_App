import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/dbConnect";
import { Response } from "@/models/Response";
import { v4 as uuidv4 } from "uuid";

// GET user responses for a specific quiz
export async function GET(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const quizName = searchParams.get("quizName");

    if (!userId && quizName) {
      return getAllQuizResponses(req);
    }

    // Check if userId and quizName are provided
    if (!userId || !quizName) {
      return NextResponse.json(
        { message: "Missing userId or quizName" },
        { status: 400 }
      );
    }

    // Find responses in the database for the specific quiz and user
    const userResponses = await Response.findOne({
      userId,
      quizName,
    })
      .populate("responses.questionId")
      .exec();

    if (!userResponses) {
      return NextResponse.json(
        { message: "No responses found for this quiz" },
        { status: 404 }
      );
    }

    return NextResponse.json(userResponses, { status: 200 });
  } catch (error) {
    console.error("Error fetching user responses:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// api/responses/route.ts
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const {
      userId,
      quizName,
      responses,
      correctAnswers,
      totalQuestions,
      score,
      username,
      userEmail,
      quizCode,
      quizId
    } = await req.json();

    // Find existing response for the specific user and quiz
    const existingResponse = await Response.findOne({
      userId,
      quizName,
    });

    const responseData = {
      userId,
      quizName,
      responses,
      totalQuestions,
      correctAnswers,
      score,
      completedAt: new Date(), // Set completion time
      username,
      userEmail,
      quizCode,
      quizId
    };

    if (existingResponse) {
      // Update existing response
      Object.assign(existingResponse, responseData);
      await existingResponse.save();
      return NextResponse.json({
        message: "Responses updated successfully",
        updatedResponse: existingResponse,
      });
    }

    // Create new response if no existing response found
    const newResponse = new Response(responseData);
    await newResponse.save();
    return NextResponse.json({
      message: "Responses saved successfully",
      newResponse,
    });
  } catch (error) {
    console.error("Error saving user responses:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}


// GET most recent responses for a specific quiz
// GET all responses for a specific quiz by quizName and quizId when quizCode is not provided
export async function getAllQuizResponses(req: NextRequest) {
  await connectDB();
  try {
    const { searchParams } = new URL(req.url);
    const quizName = searchParams.get("quizName");
    const quizCode = searchParams.get("quizCode");
    const quizId = searchParams.get("quizId");
    
    // Check if quizName is provided
    if (!quizName) {
      return NextResponse.json(
        { message: "Missing quizName parameter" },
        { status: 400 }
      );
    }
    
    // Build the query object with quizName
    const query: any = { quizName };
    
    // Add quizCode to query if provided, otherwise use quizId if available
    if (quizCode) {
      query.quizCode = quizCode;
    } else if (quizId) {
      query.quizId = quizId;
    }
    
    // Find all responses that match the query and have username and email
    const responses = await Response.find({
      ...query,
      username: { $exists: true },
      userEmail: { $exists: true }
    })
    .populate('responses.questionId')
    .exec();
    
    if (!responses || responses.length === 0) {
      return NextResponse.json(
        { message: "No responses found for this quiz" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(responses, { status: 200 });
  } catch (error) {
    console.error("Error fetching quiz responses:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}