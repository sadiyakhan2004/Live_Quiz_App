// Fetch quiz from the database
export const fetchQuiz = async (quizCode: string) => {
  try {
    const res = await fetch(`http://localhost:3000/api/quiz?quizCode=${quizCode}`);
    
    if (!res.ok) {
      throw new Error("Failed to fetch quiz");
    }
    
    const data = await res.json();
    // The API now returns a single quiz object, not an array
    return data;
  } catch (error) {
    console.error("Error fetching quiz:", error);
    return null;
  }
};

// Submit quiz configuration to the backend
export const saveQuiz = async (
  quizName: string,
  quizId: string,
  quizCode: string,
  questionIds: string[],
  timeLimit: number,
  waitingTime: number = 5,
  showAnswers: boolean = false
) => {
  try {
    const res = await fetch("http://localhost:3000/api/quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        quizName,
        quizId,
        quizCode, 
        questionIds,
        timeLimit, 
        waitingTime,
        showAnswers 
      }),
    });
    
    if (!res.ok) {
      throw new Error("Failed to submit quiz configuration");
    }
    
    return await res.json();
  } catch (error) {
    console.error("Error submitting quiz configuration:", error);
    return null;
  }
};