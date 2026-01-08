import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const UserLogin = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const socket = useSocket();
  
  const [formData, setFormData] = useState({ name: '', hospital: '', mobile: '' });
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    if (!socket) return;
    
    // 1. LISTEN FOR QUIZ START
    socket.on('game_started', () => {
      console.log("Quiz Started!");
      sessionStorage.removeItem('activePuzzle');
      navigate('/play/quiz');
    });

    // 2. LISTEN FOR PUZZLE START
    socket.on('puzzle_start', (puzzleData) => {
      console.log("Puzzle Started!");
      const size = parseInt(puzzleData?.gridSize, 10);
      const gridSize = Number.isNaN(size) ? 3 : size;
      if (puzzleData?.imageUrl) {
        sessionStorage.setItem('activePuzzle', JSON.stringify({
          imageUrl: puzzleData.imageUrl,
          gridSize
        }));
      }
      navigate('/play/puzzle');
    });

    return () => {
      socket.off('game_started');
      socket.off('puzzle_start');
    };
  }, [socket, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.mobile) return alert("Fill all details");

    sessionStorage.setItem('currentUser', JSON.stringify(formData));
    sessionStorage.setItem('currentEventId', eventId);

    if (socket) {
      socket.emit('join_room', { eventId, user: formData });
    }
    setIsWaiting(true);
  };

  if (isWaiting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-indigo-900 text-white p-6">
        <div className="animate-pulse text-6xl mb-4">⏳</div>
        <h2 className="text-2xl font-bold mb-2">Welcome, {formData.name}!</h2>
        <p className="text-indigo-200 text-center">
          You are connected to the lobby.<br/>
          Waiting for the host to start...
        </p>
      </div>
    );
  }

  // ... (Your existing Login Form JSX) ...
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Join Event</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" onChange={(e)=>setFormData({...formData, name: e.target.value})} placeholder="Name" className="w-full p-2 border rounded"/>
          <input name="hospital" onChange={(e)=>setFormData({...formData, hospital: e.target.value})} placeholder="Hospital" className="w-full p-2 border rounded"/>
          <input type="tel" name="mobile" onChange={(e)=>setFormData({...formData, mobile: e.target.value})} placeholder="Mobile" className="w-full p-2 border rounded"/>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">Join Lobby</button>
        </form>
      </div>
    </div>
  );
};

export default UserLogin;