export const fetchAllTests = async () => {
    try {
      const response = await fetch('/api/tests');
      const { data, count } = await response.json();
  
      return data;
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return []; // Return an empty array in case of error
    }
  }


  export const deleteTest = async (quizId: string) => {
    try {
      // Send delete request to the backend
      const response = await fetch(`/api/tests?quizId=${quizId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
  
      if (!response.ok) {
        throw new Error('Failed to delete test');
      }
  
      const { data } = await response.json();
  
      return {
        success: true,
        message: 'Test deleted successfully',
        deletedTest: data
      };
    } catch (error) {
      console.error('Error deleting test:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }
  