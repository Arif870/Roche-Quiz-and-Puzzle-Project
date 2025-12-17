import { useState, useEffect } from 'react'; // Ensure useEffect is imported
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { mockQuestions } from '../../mocks/questions';
import { useSocket } from '../../context/SocketContext';

const QuizGame = () => {
  const socket = useSocket();
  const navigate = useNavigate(); // Hook for redirection

  // ... (Your existing state: currentQ, score, etc.) ...
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime] = useState(() => Date.now());

  // 1. GET DATA FROM SESSION STORAGE
  const userDetails = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const eventId = sessionStorage.getItem('currentEventId');

  // 2. SAFETY CHECK: Redirect if data is missing
  useEffect(() => {
    if (!eventId || !userDetails.name) {
      alert("Please login first!");
      navigate('/'); // Send them back to Home/Login
    }
  }, [eventId, userDetails, navigate]);

  // ... (Keep the rest of your handleOptionClick and finishGame logic exactly as is) ...
  
  const handleOptionClick = (option) => {
    // ... existing code ...
    if (selected) return;
    setSelected(option);
    const isCorrect = option === mockQuestions[currentQ].answer;
    if (isCorrect) setScore(prev => prev + 1);

    setTimeout(() => {
        if (currentQ < mockQuestions.length - 1) {
            setCurrentQ(currentQ + 1);
            setSelected(null);
        } else {
            finishGame(isCorrect ? score + 1 : score);
        }
    }, 1000);
  };

  const finishGame = (finalScore) => {
    // eslint-disable-next-line react-hooks/purity
    const timeTaken = (Date.now() - startTime) / 1000;
    setIsFinished(true);

    if (socket && eventId) {
        socket.emit('submit_score', {
            eventId,
            score: finalScore,
            timeTaken,
            mobile: userDetails.mobile,
            userName: userDetails.name
        });
    } else {
        // This log will help us confirm if it's fixed
        console.error("STILL FAILING: EventId:", eventId, "Socket:", !!socket);
    }
  };

  // ... (Keep your Render/Return code exactly as is) ...
  if (isFinished) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-900 text-white">
            <h1 className="text-4xl font-bold mb-4">Quiz Completed!</h1>
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-2xl">Score: {score} / {mockQuestions.length}</p>
        </div>
    );
  }

  const question = mockQuestions[currentQ];

  return (
    // ... your existing JSX ...
    <div className="min-h-screen bg-gray-100 p-4 flex flex-col items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Question {currentQ + 1}</h2>
            <p className="text-lg mb-6 text-gray-700">{question.text}</p>
            <div className="space-y-3">
                {question.options.map((opt) => (
                    <button key={opt} onClick={() => handleOptionClick(opt)} className={`w-full p-3 rounded border text-left ${selected ? (opt === question.answer ? "bg-green-500 text-white" : opt === selected ? "bg-red-500 text-white" : "bg-gray-100") : "bg-white hover:bg-blue-50"}`} disabled={!!selected}>
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
};

export default QuizGame;