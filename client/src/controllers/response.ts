import { fetchQuestions, addQuestionInDatabase, questions } from "@/controllers/questions";

export interface ResponseData {
  questionId: string;
  userAns: string | string[]; // Can be a string or an array for multiple answers
  isCorrect?: boolean;
}

export interface ApiResponse {
  userId: string;
  responses: {
    questionId: string;
    userAns: string | string[];
    isCorrect?: boolean;
  };
  quizName: string;
  quizCode?: string;
  quizId?: string;
  correctAnswers: number;
  totalQuestions: number;
  score: number;
  createdAt?: string;
  completedAt?: string;
  username?: string;
  userEmail?: string;
}

interface CurrentQn {
  heading?: string;
  paras?: string[];
}

// Define the structure for each question's data
export interface QuestionData {
  questionId: string;
  currentQn: CurrentQn;
  options?: string[];
  correctAns: string | string[];
  type: "checkbox" | "radio" | "short-answer" | "fill-in-the-blank" | "dropdown" | "dnd";
}


// **Local responses storage**
export let responses: ResponseData[] = [];
// export let questions: QuestionData[] = [];


// Function to get unanswered questions
// Function to get unanswered questions
export const getUnansweredQuestions = async (quizName: string): Promise<string[]> => {
  try {
    // We don't need to fetch questions here anymore since we're importing them
    // But we should ensure questions array is not empty
    if (!questions || questions.length === 0) {
      console.error("Questions array is empty");
      return [];
    }

    const unansweredQuestions = questions.filter(
      (question) =>
        question && !responses.some((response) => response.questionId === question.questionId)
    );

    return unansweredQuestions.map((question) => question.questionId);
  } catch (error) {
    console.error("Error getting unanswered questions:", error);
    return [];
  }
};

//function to check correctAnswer
export const isAnswerCorrect = (questionId: any): { 
  status: boolean; 
  correctAns: string[]; 
  userAns: string[]; 
} => {
  const question = questions.find((q) => q.questionId === questionId);
  
  if (!question) {
    return {
      status: false,
      correctAns: [],
      userAns: [],
    };
  }

  const userResponse = responses.find(
    (res) => res.questionId === questionId
  );

  if (!userResponse) {
    return {
      status: false,
      correctAns: [],
      userAns: [],
    };
  }

  const correctAnsArray = Array.isArray(question.correctAns)
    ? question.correctAns
    : [question.correctAns];

  const userAnsArray = Array.isArray(userResponse.userAns)
    ? userResponse.userAns
    : [userResponse.userAns];

  const isCorrect =
    correctAnsArray.length === userAnsArray.length &&
    correctAnsArray.every((ans) => userAnsArray.includes(ans)) &&
    userAnsArray.every((ans) => correctAnsArray.includes(ans));

  return {
    status: isCorrect,
    correctAns: correctAnsArray,
    userAns: userAnsArray,
  };
};



// **Function to update responses**
export const updateResponse = (
  questionId: string,
  userAns: string | string[]
) => {
  const existingIndex = responses.findIndex(
    (res) => res.questionId === questionId
  );

 
  const question = questions.find((q) => q.questionId === questionId);
  
  if (!question) {
    console.error(`Question with ID ${questionId} not found`);
    return;
  }

  // Evaluate if the answer is correct
  const correctAnsArray = Array.isArray(question.correctAns)
    ? question.correctAns
    : [question.correctAns];

  const userAnsArray = Array.isArray(userAns)
    ? userAns
    : [userAns];

  const isCorrect =
    correctAnsArray.length === userAnsArray.length &&
    correctAnsArray.every((ans) => userAnsArray.includes(ans)) &&
    userAnsArray.every((ans) => correctAnsArray.includes(ans));

  if (existingIndex !== -1) {
    // Update existing response
    responses[existingIndex].userAns = userAns;
    responses[existingIndex].isCorrect = isCorrect;
  } else {
    // Add new response
    responses.push({ questionId, userAns, isCorrect });
  }
};

export const fetchUserResponses = async (
  userId: string,
  quizName :string,
): Promise<ApiResponse | null> => {
  try {
    if (!userId) {
      console.error("Missing userId or testId");
      return null;
    }

    const res = await fetch(
      `http://localhost:3000/api/responses?userId=${userId}&quizName=${quizName}`,
      {
        method: "GET",
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch responses");
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching responses:", error);
    return null;
  }
};

// **Submit user responses to the backend**
export const submitUserResponses = async (
  userId: string,
  quizName : string,
  username?: string,
  userEmail?: string,
  quizCode?: string,
  quizId?: string,
): Promise<ApiResponse | null> => {


  // Calculate score - count correct answers
  const correctAnswers = responses.filter(response => response.isCorrect == true).length;
  console.log("correctAnswers",correctAnswers);
  const totalQuestions = questions.length;
  const score = (correctAnswers / totalQuestions) * 100;

  try {
    if (responses.length === 0) {
      throw new Error("No responses to submit");
    }

    const res = await fetch("http://localhost:3000/api/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId,quizName,quizCode,quizId, responses ,correctAnswers,totalQuestions,score, username, userEmail}),
    });

    if (!res.ok) {
      throw new Error("Failed to submit responses");
    }

    return await res.json();
  } catch (error) {
    console.error("Error submitting responses:", error);
    return null;
  }
};


// Function to fetch most recent responses for a specific quiz
export const fetchRecentQuizResponses = async (
  quizName: string,
  quizCode?: string,
  quizId?: string
): Promise<ApiResponse[] | null> => {
  try {
    if (!quizName) {
      console.error("Missing quizName parameter");
      return null;
    }
    
    // Build the URL with quizName and optional parameters
    let url = `http://localhost:3000/api/responses?quizName=${encodeURIComponent(quizName)}`;
    
    // Add quizCode if provided
    if (quizCode) {
      url += `&quizCode=${encodeURIComponent(quizCode)}`;
    }
    // Add quizId if provided and quizCode is not provided
    else if (quizId) {
      url += `&quizId=${encodeURIComponent(quizId)}`;
    }
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn("No recent responses found for this quiz");
        return [];
      }
      throw new Error(`Failed to fetch recent responses: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error("Error fetching recent quiz responses:", error);
    return null;
  }
};