// src/pages/Admin/AdminDashboard.jsx
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Create Quiz */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Create New Quiz</h2>
            <p className="text-gray-600 mb-4">Set up a new quiz event with Question Bank integration.</p>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded">Create Quiz</button>
          </div>

          {/* Card 2: Create Puzzle */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Create Photo Puzzle</h2>
            <p className="text-gray-600 mb-4">Upload an image and set difficulty (4x4 or 6x6).</p>
            <button className="bg-pink-600 text-white px-4 py-2 rounded">Create Puzzle</button>
          </div>
          
          {/* Card 3: Live Monitor */}
          <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
            <h2 className="text-xl font-bold mb-2">Live Monitor</h2>
            <p className="text-gray-600 mb-4">Watch 4 players compete in real-time.</p>
            <button className="bg-green-600 text-white px-4 py-2 rounded">Open Monitor</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;