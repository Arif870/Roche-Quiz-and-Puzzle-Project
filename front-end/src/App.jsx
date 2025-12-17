import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

// Import Pages
import UserLogin from './pages/User/UserLogin';
import QuizGame from './pages/User/QuizGame';
import PuzzleGame from './pages/User/PuzzleGame';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminRoom from './pages/Admin/AdminRoom'; // Ensure this file exists!

// Temporary "Home" component for easy navigation during development
const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <h1 className='text-5xl mb-4'>🚀</h1>
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Roche Digital Engagement Project</h1>
        <p className="mb-8 text-gray-600">Select a panel to start testing:</p>
        
        <div className="space-y-4">
          <Link 
            to="/admin" 
            className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Go to Admin Dashboard
          </Link>
          
          {/* Direct link to monitor a specific test room */}
          <Link 
            to="/admin/monitor/test-room-1" 
            className="block w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
             Admin: Monitor "Test Room 1"
          </Link>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <Link 
            to="/join/test-room-1" 
            className="block w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Join "Test Room 1" (Mobile User)
          </Link>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The Root Route - Project Hub */}
        <Route path="/" element={<Home />} />

        {/* --- User Mobile Routes --- */}
        <Route path="/join/:eventId" element={<UserLogin />} />
        <Route path="/play/quiz" element={<QuizGame />} />
        <Route path="/play/puzzle" element={<PuzzleGame />} />

        {/* --- Admin Desktop Routes --- */}
        <Route path="/admin" element={<AdminDashboard />} />
        {/* The Monitor Page where Admin starts the game */}
        <Route path="/admin/monitor/:eventId" element={<AdminRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;