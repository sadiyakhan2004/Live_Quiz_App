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


    // Define a helper function to calculate correct answers from responses
    function calculateCorrectAnswers(responseArray : any) {
      return responseArray.filter((response:any )=> response.isCorrect).length;
    }

// add responses with quizCode and without quizCode
export async function POST(req: NextRequest) {
  await connectDB();
  try {
    const {
      userId,
      quizName,
      responses,
      totalQuestions,
      username,
      userEmail,
      quizCode,
      quizId,
      isCompleted
    } = await req.json();

    // Create response data object with TypeScript interface
    interface ResponseData {
      userId: string;
      quizName: string;
      responses: any[];
      totalQuestions: number;
      correctAnswers: number;
      score: number;
      username?: string;
      userEmail?: string;
      quizCode?: string;
      quizId?: string;
      completedAt?: Date;
    }

    // Case 1: With quizCode
    if (quizCode) {
      // Check if user has already started this quiz with this code
      const existingResponseWithCode = await Response.findOne({
        userId,
        quizName,
        quizCode,
      });

      // If this quiz with this code has already been completed, prevent further submissions
      if (existingResponseWithCode && existingResponseWithCode.completedAt) {
        return NextResponse.json(
          { 
            message: "You have already completed this quiz. Multiple submissions are not allowed." 
          },
          { status: 403 }
        );
      } 
      
      // If quiz with this code exists but isn't completed, append only unique responses
      if (existingResponseWithCode) {
        // Create a set of existing question IDs to track what we already have
        const existingQuestionIds = new Set();
        existingResponseWithCode.responses.forEach((response:any) => {
          if (response.questionId) {
            existingQuestionIds.add(response.questionId);
          }
        });
        
        // Filter out responses for questions that have already been answered
        const uniqueNewResponses = responses.filter((response:any) => 
          !existingQuestionIds.has(response.questionId)
        );
        
        // If there are no new unique responses, return the existing data
        if (uniqueNewResponses.length === 0) {
          return NextResponse.json({
            message: "No new unique responses to add",
            response: existingResponseWithCode,
          });
        }
        
        // Combine existing responses with unique new ones
        const allResponses = [
          ...existingResponseWithCode.responses,
          ...uniqueNewResponses
        ];
        
        // Recalculate correct answers from all responses
        const totalCorrectAnswers = calculateCorrectAnswers(allResponses);
        
        // Calculate score based on the total correct answers
        const score = (totalCorrectAnswers / totalQuestions) * 100;
        
        // Update the response record
        existingResponseWithCode.responses = allResponses;
        existingResponseWithCode.correctAnswers = totalCorrectAnswers;
        existingResponseWithCode.score = score;
        
        // Set completedAt only if the quiz is being completed now
        if (isCompleted) {
          existingResponseWithCode.completedAt = new Date();
        }
        
        await existingResponseWithCode.save();
        return NextResponse.json({
          message: "Unique responses with quizCode added successfully",
          updatedResponse: existingResponseWithCode,
        });
      } else {
        // For a new quiz, remove any duplicate responses (if multiple for same question)
        const uniqueResponses = removeDuplicateResponses(responses);
        
        // Calculate correct answers for new responses
        const newCorrectAnswers = calculateCorrectAnswers(uniqueResponses);
        
        // Calculate score for new responses
        const score = (newCorrectAnswers / totalQuestions) * 100;
        
        // Create new response data
        const responseData: ResponseData = {
          userId,
          quizName,
          responses: uniqueResponses,
          totalQuestions,
          correctAnswers: newCorrectAnswers,
          score,
          username,
          userEmail,
          quizCode,
          quizId
        };
        
        // Set completedAt if the quiz is being completed
        if (isCompleted) {
          responseData.completedAt = new Date();
        }
        
        // Create new response with quizCode
        const newResponse = new Response(responseData);
        await newResponse.save();
        return NextResponse.json({
          message: "Responses with quizCode saved successfully",
          newResponse,
        });
      }
    } 
    // Case 2: Without quizCode - replace existing
    else {
      // For responses without quizCode, find by userId and quizName where quizCode doesn't exist
      const existingResponseWithoutCode = await Response.findOne({
        userId,
        quizName,
        quizCode: { $exists: false }
      });

      // Remove duplicate responses from the input
      const uniqueResponses = removeDuplicateResponses(responses);
      
      // Calculate correct answers for unique responses
      const newCorrectAnswers = calculateCorrectAnswers(uniqueResponses);
      
      // Calculate score for new responses
      const score = (newCorrectAnswers / totalQuestions) * 100;
      
      // Create response data
      const responseData: ResponseData = {
        userId,
        quizName,
        responses: uniqueResponses,
        totalQuestions,
        correctAnswers: newCorrectAnswers,
        score,
        username,
        userEmail,
        quizId
      };
      
      // Set completedAt if the quiz is being completed
      if (isCompleted) {
        responseData.completedAt = new Date();
      }

      if (existingResponseWithoutCode) {
        // Replace existing response without code
        Object.assign(existingResponseWithoutCode, responseData);
        await existingResponseWithoutCode.save();
        return NextResponse.json({
          message: "Responses without quizCode updated successfully",
          updatedResponse: existingResponseWithoutCode,
        });
      } else {
        // Create new response without quizCode
        const newResponse = new Response(responseData);
        await newResponse.save();
        return NextResponse.json({
          message: "Responses without quizCode saved successfully",
          newResponse,
        });
      }
    }
  } catch (error) {
    console.error("Error saving user responses:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Helper function to remove duplicate responses based on questionId
function removeDuplicateResponses(responses:any) {
  const seen = new Set();
  return responses.filter((response:any) => {
    if (!response.questionId || seen.has(response.questionId)) {
      return false;
    }
    seen.add(response.questionId);
    return true;
  });
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