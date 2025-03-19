import React, { useState, useEffect } from 'react';
import { fetchRecentQuizResponses } from '@/controllers/response';
import { ApiResponse } from '@/controllers/response';
import { Medal, Award, Trophy, ChevronDown, ChevronUp, Users, Clock, CheckCircle, AlertTriangle, Calendar, Hash } from 'lucide-react';

interface QuizResultsProps {
  quizName: string;
  quizCode?: string;
  quizId?: string;
}

const QuizResults: React.FC<QuizResultsProps> = ({ quizName, quizCode, quizId }) => {
  const [allResults, setAllResults] = useState<ApiResponse[] | null>(null);
  const [results, setResults] = useState<ApiResponse[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableQuizCodes, setAvailableQuizCodes] = useState<string[]>([]);
  const [selectedQuizCode, setSelectedQuizCode] = useState<string>('');

  useEffect(() => {
    const getResults = async () => {
      try {
        setLoading(true);
        const data = await fetchRecentQuizResponses(quizName, quizCode, quizId);
        setAllResults(data);
        
        // If there's a specific quizCode passed as prop, just use all data
        if (quizCode) {
          setResults(data);
        } else {
          // Extract unique dates from the data
          const uniqueDates = data ? extractUniqueDates(data) : [];
          setAvailableDates(uniqueDates);
          
          // Select the most recent date by default
          if (uniqueDates.length > 0) {
            const mostRecentDate = uniqueDates[0];
            setSelectedDate(mostRecentDate);
            
            // Filter results for the most recent date
            if (data) {
              const filteredByDate = filterResultsByDate(data, mostRecentDate);
              setResults(filteredByDate);
              
              // Get available quiz codes for this date
              const quizCodesForDate = extractUniqueQuizCodes(filteredByDate);
              setAvailableQuizCodes(quizCodesForDate);
              
              // Select the first quiz code by default if available
              if (quizCodesForDate.length > 0) {
                setSelectedQuizCode(quizCodesForDate[0]);
                setResults(filterResultsByQuizCode(filteredByDate, quizCodesForDate[0]));
              }
            }
          } else {
            setResults(data);
          }
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load quiz results');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    getResults();
  }, [quizName, quizCode, quizId]);

  const extractUniqueDates = (data: ApiResponse[]): string[] => {
    if (!data || data.length === 0) return [];
    
    // Extract unique dates from completedAt timestamps
    const uniqueDatesMap = new Map();
    
    data.forEach(item => {
      if (item.completedAt) {
        const date = new Date(item.completedAt).toISOString().split('T')[0];
        uniqueDatesMap.set(date, true);
      }
    });
    
    // Convert map keys to array and sort by date (most recent first)
    return Array.from(uniqueDatesMap.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const extractUniqueQuizCodes = (data: ApiResponse[]): string[] => {
    if (!data || data.length === 0) return [];
    
    // Extract unique quiz codes
    const uniqueQuizCodesMap = new Map();
    
    data.forEach(item => {
      if (item.quizCode) {
        uniqueQuizCodesMap.set(item.quizCode, true);
      }
    });
    
    // Convert map keys to array and sort alphabetically
    return Array.from(uniqueQuizCodesMap.keys()).sort();
  };

  const filterResultsByDate = (data: ApiResponse[], date: string): ApiResponse[] => {
    if (!data || data.length === 0) return [];
    
    return data.filter(item => {
      if (!item.completedAt) return false;
      const itemDate = new Date(item.completedAt).toISOString().split('T')[0];
      return itemDate === date;
    });
  };

  const filterResultsByQuizCode = (data: ApiResponse[], code: string): ApiResponse[] => {
    if (!data || data.length === 0) return [];
    
    return data.filter(item => {
      return item.quizCode === code;
    });
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newDate = event.target.value;
    setSelectedDate(newDate);
    
    if (allResults) {
      const filteredByDate = filterResultsByDate(allResults, newDate);
      
      // Get available quiz codes for this date
      const quizCodesForDate = extractUniqueQuizCodes(filteredByDate);
      setAvailableQuizCodes(quizCodesForDate);
      
      // Select the first quiz code by default if available
      if (quizCodesForDate.length > 0) {
        setSelectedQuizCode(quizCodesForDate[0]);
        setResults(filterResultsByQuizCode(filteredByDate, quizCodesForDate[0]));
      } else {
        setSelectedQuizCode('');
        setResults(filteredByDate);
      }
    }
  };

  const handleQuizCodeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newQuizCode = event.target.value;
    setSelectedQuizCode(newQuizCode);
    
    if (allResults && selectedDate) {
      const filteredByDate = filterResultsByDate(allResults, selectedDate);
      setResults(filterResultsByQuizCode(filteredByDate, newQuizCode));
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedResults = () => {
    if (!results) return [];
    
    return [...results].sort((a, b) => {
      let valA, valB;
      
      switch (sortField) {
        case 'name':
          valA = a.username || 'Anonymous';
          valB = b.username || 'Anonymous';
          return sortDirection === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        case 'email':
          valA = a.userEmail || 'N/A';
          valB = b.userEmail || 'N/A';
          return sortDirection === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        case 'completionTime':
          valA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          valB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        case 'correctAnswers':
          return sortDirection === 'asc' 
            ? a.correctAnswers - b.correctAnswers 
            : b.correctAnswers - a.correctAnswers;
        default: // score is default
          return sortDirection === 'asc' ? a.score - b.score : b.score - a.score;
      }
    });
  };

  const getTopThreeParticipants = () => {
    if (!results || results.length === 0) return [];
    
    // Always sort by score in descending order for top three
    return [...results]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return <Trophy className="text-yellow-500" size={24} />;
    } else if (index === 1) {
      return <Medal className="text-gray-400" size={24} />;
    } else if (index === 2) {
      return <Award className="text-amber-600" size={24} />;
    }
    return null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        <p className="text-blue-500 font-medium">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-500 rounded-lg shadow">
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-4" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-red-700">Error</h3>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="p-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg shadow">
        <div className="flex items-center">
          <AlertTriangle className="text-yellow-500 mr-4" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-yellow-700">No Results</h3>
            <p className="text-yellow-600">No participants have completed this quiz yet.</p>
          </div>
        </div>
      </div>
    );
  }

  const topThree = getTopThreeParticipants();
  const sorted = sortedResults();
  const averageScore = (results.reduce((acc, result) => acc + result.score, 0) / results.length).toFixed(1);
  const highestScore = Math.max(...results.map(result => result.score)).toFixed(1);
  const lowestScore = Math.min(...results.map(result => result.score)).toFixed(1);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 border border-gray-100">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Quiz Results: {quizName}</h2>
        {quizCode ? (
          <div className="flex items-center text-gray-500 mb-1">
            <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">Code: {quizCode}</span>
          </div>
        ) : (
          <div>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4 mb-4">
              <div className="flex items-center space-x-2">
                <Calendar size={20} className="text-indigo-500" />
                <div className="relative">
                  <select
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 pr-10 appearance-none"
                  >
                    {availableDates.map((date) => (
                      <option key={date} value={date}>
                        {formatDate(date)}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <ChevronDown size={16} />
                  </div>
                </div>
              </div>
              
              {availableQuizCodes.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Hash size={20} className="text-indigo-500" />
                  <div className="relative">
                    <select
                      value={selectedQuizCode}
                      onChange={handleQuizCodeChange}
                      className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full p-2.5 pr-10 appearance-none"
                    >
                      {availableQuizCodes.map((code) => (
                        <option key={code} value={code}>
                          Code: {code}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center text-gray-500">
          <Users size={16} className="mr-1" />
          <span>{results.length} participants</span>
          {!quizCode && (
            <span className="ml-2 text-sm">
              {selectedDate && `on ${formatDate(selectedDate)}`}
              {selectedQuizCode && ` (Code: ${selectedQuizCode})`}
            </span>
          )}
        </div>
      </div>

      {topThree.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
            <Trophy size={20} className="mr-2 text-yellow-500" />
            Top Performers
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topThree.map((participant, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg shadow-md border-t-4 ${
                  index === 0 ? 'border-yellow-400 bg-yellow-50' : 
                  index === 1 ? 'border-gray-300 bg-gray-50' : 
                  'border-amber-500 bg-amber-50'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-lg">
                    {index + 1}{index === 0 ? 'st' : index === 1 ? 'nd' : 'rd'} Place
                  </span>
                  {getRankBadge(index)}
                </div>
                <div className="text-lg font-medium">{participant.username || 'Anonymous'}</div>
                <div className="text-gray-500 text-sm mb-2">{participant.userEmail || 'N/A'}</div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-sm text-gray-600">Score</div>
                  <div className="text-xl font-bold text-indigo-600">{participant.score.toFixed(1)}%</div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="text-sm text-gray-600">Correct</div>
                  <div className="text-indigo-600">{participant.correctAnswers}/{participant.totalQuestions}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
          <CheckCircle size={20} className="mr-2 text-green-500" />
          Summary Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-lg shadow-sm border border-blue-100">
            <div className="text-blue-500 mb-1 text-sm font-medium">Average Score</div>
            <div className="text-3xl font-bold text-blue-700">{averageScore}%</div>
            <div className="mt-2 h-2 bg-blue-100 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, parseFloat(averageScore))}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-lg shadow-sm border border-green-100">
            <div className="text-green-500 mb-1 text-sm font-medium">Highest Score</div>
            <div className="text-3xl font-bold text-green-700">{highestScore}%</div>
            <div className="mt-2 h-2 bg-green-100 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, parseFloat(highestScore))}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-5 rounded-lg shadow-sm border border-purple-100">
            <div className="text-purple-500 mb-1 text-sm font-medium">Lowest Score</div>
            <div className="text-3xl font-bold text-purple-700">{lowestScore}%</div>
            <div className="mt-2 h-2 bg-purple-100 rounded-full overflow-hidden">
              <div 
                className="bg-purple-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, parseFloat(lowestScore))}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
          <Users size={20} className="mr-2 text-indigo-500" />
          All Participants
          {!quizCode && (
            <span className="ml-2 text-base font-normal text-gray-500">
              {selectedDate && `for ${formatDate(selectedDate)}`}
              {selectedQuizCode && ` (Code: ${selectedQuizCode})`}
            </span>
          )}
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
              <tr>
                <th className="py-3 px-4 text-left cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center">
                    <span>Name</span>
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-left cursor-pointer" onClick={() => handleSort('email')}>
                  <div className="flex items-center">
                    <span>Email</span>
                    {sortField === 'email' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center cursor-pointer" onClick={() => handleSort('score')}>
                  <div className="flex items-center justify-center">
                    <span>Score</span>
                    {sortField === 'score' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center cursor-pointer" onClick={() => handleSort('correctAnswers')}>
                  <div className="flex items-center justify-center">
                    <span>Correct</span>
                    {sortField === 'correctAnswers' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Total</th>
                <th className="py-3 px-4 text-center cursor-pointer" onClick={() => handleSort('completionTime')}>
                  <div className="flex items-center justify-center">
                    <span>Completion Time</span>
                    {sortField === 'completionTime' && (
                      sortDirection === 'asc' ? <ChevronUp size={16} className="ml-1" /> : <ChevronDown size={16} className="ml-1" />
                    )}
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Rank</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((result, index) => {
                const rankIndex = topThree.findIndex(
                  top => top.username === result.username && top.userEmail === result.userEmail
                );
                
                return (
                  <tr 
                    key={index} 
                    className={`
                      ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      ${rankIndex === 0 ? 'bg-yellow-50' : ''}
                      ${rankIndex === 1 ? 'bg-gray-100' : ''}
                      ${rankIndex === 2 ? 'bg-amber-50' : ''}
                      hover:bg-indigo-50 transition-colors duration-150
                    `}
                  >
                    <td className="py-3 px-4 border-b border-gray-100">{result.username || 'Anonymous'}</td>
                    <td className="py-3 px-4 border-b border-gray-100">{result.userEmail || 'N/A'}</td>
                    <td className="py-3 px-4 border-b border-gray-100 text-center">
                      <span className={`
                        px-2 py-1 rounded-full text-white font-medium text-sm
                        ${result.score >= 90 ? 'bg-green-500' : 
                          result.score >= 70 ? 'bg-blue-500' : 
                          result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}
                      `}>
                        {result.score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 border-b border-gray-100 text-center font-medium">{result.correctAnswers}</td>
                    <td className="py-3 px-4 border-b border-gray-100 text-center text-gray-600">{result.totalQuestions}</td>
                    <td className="py-3 px-4 border-b border-gray-100 text-center text-sm">
                      {result.completedAt ? new Date(result.completedAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4 border-b border-gray-100 text-center">
                      {rankIndex !== -1 && (
                        <div className="flex justify-center">
                          {getRankBadge(rankIndex)}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    
      <div className="mt-6 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
          <Clock size={20} className="mr-2 text-indigo-500" />
          Performance Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Excellent (90%+)</div>
            <div className="flex items-center">
              <div className="text-xl font-bold text-green-600 mr-2">
                {results.filter(r => r.score >= 90).length}
              </div>
              <div className="text-sm text-gray-500">
                ({((results.filter(r => r.score >= 90).length / results.length) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full rounded-full" 
                style={{ width: `${(results.filter(r => r.score >= 90).length / results.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Good (70-89%)</div>
            <div className="flex items-center">
              <div className="text-xl font-bold text-blue-600 mr-2">
                {results.filter(r => r.score >= 70 && r.score < 90).length}
              </div>
              <div className="text-sm text-gray-500">
                ({((results.filter(r => r.score >= 70 && r.score < 90).length / results.length) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="bg-blue-500 h-full rounded-full" 
                style={{ width: `${(results.filter(r => r.score >= 70 && r.score < 90).length / results.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Average (50-69%)</div>
            <div className="flex items-center">
              <div className="text-xl font-bold text-yellow-600 mr-2">
                {results.filter(r => r.score >= 50 && r.score < 70).length}
              </div>
              <div className="text-sm text-gray-500">
                ({((results.filter(r => r.score >= 50 && r.score < 70).length / results.length) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="bg-yellow-500 h-full rounded-full" 
                style={{ width: `${(results.filter(r => r.score >= 50 && r.score < 70).length / results.length) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Needs Improvement (50%)</div>
            <div className="flex items-center">
              <div className="text-xl font-bold text-red-600 mr-2">
                {results.filter(r => r.score < 50).length}
              </div>
              <div className="text-sm text-gray-500">
                ({((results.filter(r => r.score < 50).length / results.length) * 100).toFixed(1)}%)
              </div>
            </div>
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 h-full rounded-full" 
                style={{ width: `${(results.filter(r => r.score < 50).length / results.length) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 flex items-center">
          <CheckCircle size={20} className="mr-2 text-green-500" />
          Success Rate by Question
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Question #</th>
                <th className="py-3 px-4 text-center">Success Rate</th>
                <th className="py-3 px-4 text-center">Correct / Total</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: results[0]?.totalQuestions || 0 }).map((_, qIndex) => {
                const questionNumber = qIndex + 1;
                // This is a placeholder - in a real app, you would calculate this from your data
                // For now, generate random data for demonstration
                const correctCount = Math.floor(Math.random() * results.length);
                const successRate = (correctCount / results.length) * 100;
                
                return (
                  <tr key={qIndex} className={qIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="py-3 px-4 border-b border-gray-100 font-medium">Question {questionNumber}</td>
                    <td className="py-3 px-4 border-b border-gray-100">
                      <div className="flex items-center">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                          <div 
                            className={`h-2.5 rounded-full ${
                              successRate >= 80 ? 'bg-green-500' : 
                              successRate >= 60 ? 'bg-blue-500' : 
                              successRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} 
                            style={{ width: `${successRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium">{successRate.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 border-b border-gray-100 text-center">
                      {correctCount} / {results.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    <div className="flex justify-between mt-8">
      <button 
        className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg shadow flex items-center transition-colors duration-200"
        onClick={() => window.history.back()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Quizzes
      </button>
      
      <button 
        className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-lg shadow flex items-center transition-colors duration-200"
        onClick={() => window.print()}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Export Results
      </button>
    </div>
  </div>
);
};

export default QuizResults;