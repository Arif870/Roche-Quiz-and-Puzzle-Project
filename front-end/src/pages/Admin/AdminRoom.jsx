import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { QRCodeSVG } from 'qrcode.react';

const AdminRoom = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();

  const isAuthenticated = useMemo(
    () => Boolean(sessionStorage.getItem('adminSession')),
    []
  );

  // Data
  const [players, setPlayers] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);

  // View State: 'waiting' (Lobby) | 'playing' (Game Active)
  const [gameStatus, setGameStatus] = useState('waiting');

  // Tab State: 'quiz' | 'puzzle'
  const [activeTab, setActiveTab] = useState('quiz');

  // Puzzle Specifics
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [difficulty, setDifficulty] = useState('3');

  const [showQRModal, setShowQRModal] = useState(false);
  const hostname = window.location.hostname;
  const joinLink = `http://${hostname}:5173/join/${eventId}`;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const raw = localStorage.getItem('adminEvents');
    if (raw) {
      const saved = JSON.parse(raw);
      const found = saved.find((evt) => evt.eventId === eventId);
      setEventDetails(found || null);
      if (found?.difficulty) {
        const numeric = parseInt(found.difficulty, 10);
        if (!Number.isNaN(numeric)) setDifficulty(String(numeric));
      }
    }
  }, [eventId]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join_room', { eventId, user: { name: 'ADMIN', type: 'admin' } });

    // 1. Player Joins Lobby
    socket.on('player_list_update', (roomPlayers) => {
        // Filter out admin
        const realPlayers = roomPlayers.filter(p => p.type !== 'admin');

        // If we are waiting, just show everyone
        // If playing, update the list but keep existing data
        setPlayers(prev => {
            return realPlayers.map(np => {
                const existing = prev.find(p => p.mobile === np.mobile);
                return { ...np, currentTiles: existing?.currentTiles || [] };
            });
        });
    });

    // 2. Live Puzzle Moves
    socket.on('admin_live_update', (data) => {
        setPlayers(prev => prev.map(p => {
            if (String(p.mobile) === String(data.mobile)) {
                return { ...p, currentTiles: data.tiles };
            }
            return p;
        }));
    });

    // 3. Scores Updating
    socket.on('leaderboard_update', (sortedList) => {
        setPlayers(prev => {
             return sortedList.filter(p => p.type !== 'admin').map(np => {
                const existing = prev.find(p => p.mobile === np.mobile);
                return { ...np, currentTiles: existing?.currentTiles || [] };
            });
        });
    });

    return () => {
      socket.off('player_list_update');
      socket.off('leaderboard_update');
      socket.off('admin_live_update');
    };
  }, [socket, eventId]);

  // --- ACTIONS ---

  const startQuiz = () => {
    socket.emit('start_game', eventId);
    setGameStatus('playing'); // Switch UI to Leaderboard
    setActiveTab('quiz');
    setImageUrl(null);
  };

  const startPuzzle = async () => {
    if (!selectedFile) return alert("Select an image!");
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('eventId', eventId);
    formData.append('difficulty', difficulty);

    try {
      const response = await fetch(`http://${hostname}:3001/upload-puzzle`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
          setImageUrl(data.imageUrl);
          setGameStatus('playing'); // Switch UI to Live Monitor
          setActiveTab('live');
      }
    // eslint-disable-next-line no-unused-vars
    } catch (e) {
      alert("Error uploading");
    } finally {
      setIsUploading(false);
    }
  };

  const resetLobby = () => {
      // Reload page to reset view to Lobby
      if(confirm("End current game and go back to Lobby?")) {
          window.location.reload();
      }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 relative">

      {/* QR MODAL */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
          <div className="bg-white p-6 rounded-2xl text-center shadow-2xl">
            <QRCodeSVG value={joinLink} size={400} />
            <p className="text-gray-900 font-bold mt-4 text-2xl tracking-wider">SCAN TO JOIN</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8 border-b border-gray-700 pb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Lobby: {eventId}</h1>
            <p className="text-gray-400">
               {gameStatus === 'waiting' ? "Waiting for players to join..." : "GAME IN PROGRESS"}
            </p>
            {eventDetails && (
              <div className="mt-3 text-sm text-gray-300 space-y-1">
                <p><span className="text-gray-400">Event:</span> {eventDetails.name}</p>
                <p><span className="text-gray-400">Mode:</span> {eventDetails.type === 'puzzle' ? 'Photo puzzle' : 'Quiz'} • Difficulty: {eventDetails.difficulty}</p>
                <p><span className="text-gray-400">Timing:</span> {eventDetails.timed ? `${eventDetails.duration} min bound` : 'No time bound'} • Group play: {eventDetails.groupPlay ? 'Yes' : 'Single play'}</p>
              </div>
            )}
          </div>

          {/* QR THUMBNAIL (Always visible in waiting mode) */}
          {gameStatus === 'waiting' && (
             <div className="flex items-center gap-4 bg-gray-800 p-2 rounded-lg cursor-pointer hover:bg-gray-700 transition group" onClick={() => setShowQRModal(true)}>
               <div className="text-right hidden md:block">
                 <p className="text-sm font-bold text-gray-300">Click to Enlarge</p>
                 <p className="text-xs text-blue-400">Scan to Join</p>
               </div>
               <div className="bg-white p-2 rounded">
                 <QRCodeSVG value={joinLink} size={60} />
               </div>
            </div>
          )}

          {/* RESET BUTTON (Visible when playing) */}
          {gameStatus === 'playing' && (
              <button onClick={resetLobby} className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded font-bold text-white shadow-lg">
                  🛑 END GAME & RESET
              </button>
          )}
        </header>

        {/* ==================================================================================== */}
        {/* VIEW 1: LOBBY (WAITING) */}
        {/* Only show this BEFORE game starts. No Leaderboard here. */}
        {/* ==================================================================================== */}
        {gameStatus === 'waiting' && (
           <div className="space-y-8">

             {/* GAME SELECTOR */}
             <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold mb-4 text-center">Choose a Game to Start</h3>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* LEFT: QUIZ */}
                    <div className="flex-1 bg-gray-900 p-4 rounded-lg border border-gray-700 text-center hover:border-blue-500 transition cursor-pointer" onClick={() => setActiveTab('quiz')}>
                        <h4 className="text-blue-400 font-bold text-lg mb-2">❓ Quiz Mode</h4>
                        <p className="text-gray-400 text-sm mb-4">Run a question-based competition.</p>
                        <button onClick={startQuiz} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full w-full">🚀 START QUIZ</button>
                    </div>

                    {/* RIGHT: PUZZLE */}
                    <div className="flex-1 bg-gray-900 p-4 rounded-lg border border-gray-700 text-center hover:border-purple-500 transition cursor-pointer" onClick={() => setActiveTab('puzzle')}>
                        <h4 className="text-purple-400 font-bold text-lg mb-2">🧩 Puzzle Mode</h4>
                        <p className="text-gray-400 text-sm mb-4">Upload an image for a slide puzzle.</p>

                        <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                                <input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files[0])} className="text-xs text-gray-400 w-full" />
                                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="bg-gray-800 text-white text-xs p-1 rounded border border-gray-600">
                                    <option value="3">3 x 3</option>
                                    <option value="4">4 x 4</option>
                                    <option value="6">6 x 6</option>
                                </select>
                            </div>
                            <button onClick={startPuzzle} disabled={isUploading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 rounded w-full">
                                {isUploading ? "Uploading..." : "🚀 START PUZZLE"}
                            </button>
                        </div>
                    </div>
                </div>
             </div>

             {/* WAITING LIST (Just Names) */}
             <div>
                <h3 className="text-gray-400 font-bold mb-4 flex items-center gap-2">
                    <span>👥 Lobby Waiting List</span>
                    <span className="bg-gray-700 text-white text-xs px-2 py-1 rounded-full">{players.length}</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {players.map((p, i) => (
                    <div key={i} className="bg-gray-800 p-3 rounded border border-gray-700 font-bold flex items-center gap-2 animate-fade-in">
                       <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                       <span className="truncate">{p.name}</span>
                    </div>
                  ))}
                  {players.length === 0 && <p className="text-gray-500 italic col-span-4">Waiting for players to scan QR code...</p>}
                </div>
             </div>
           </div>
        )}


        {/* ==================================================================================== */}
        {/* VIEW 2: GAME ACTIVE (RESULTS / LIVE MONITOR) */}
        {/* Only shown AFTER Start is clicked. */}
        {/* ==================================================================================== */}
        {gameStatus === 'playing' && (
            <div>
                {/* SUB-TABS for View Switching */}
                <div className="flex gap-2 mb-6">
                    <button onClick={() => setActiveTab('leaderboard')} className={`px-4 py-2 rounded-t-lg font-bold ${activeTab === 'leaderboard' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400'}`}>🏆 Leaderboard</button>
                    {/* Only show Live Monitor if it's a puzzle game */}
                    {imageUrl && (
                        <button onClick={() => setActiveTab('live')} className={`px-4 py-2 rounded-t-lg font-bold ${activeTab == 'live' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'}`}>🔴 Live Monitor</button>
                    )}
                </div>

                {/* TAB 1: LEADERBOARD */}
                {activeTab === 'leaderboard' && (
                    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
                        <table className="w-full text-left">
                        <thead className="bg-gray-700 text-gray-300">
                            <tr>
                                <th className="p-4">Rank</th>
                                <th className="p-4">Player</th>
                                <th className="p-4">Score</th>
                                <th className="p-4 text-center">Time</th>
                                <th className="p-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                            {players.map((p, i) => (
                            <tr key={i} className={i===0?"bg-green-900/30":""}>
                                <td className="p-4 font-bold">#{i+1}</td>
                                <td className="p-4 font-bold">{p.name}</td>
                                <td className="p-4 text-yellow-400 font-bold">{p.score}</td>
                                <td className="p-4 text-center font-mono text-blue-300">{p.timeTaken ? `${p.timeTaken.toFixed(1)}s` : '-'}</td>
                                <td className="p-4 text-right">
                                {p.finished ? (
                                    <span className="bg-green-600 text-xs px-2 py-1 rounded text-white font-bold">FINISHED</span>
                                ) : (
                                    <span className="bg-blue-600 text-xs px-2 py-1 rounded text-white animate-pulse">PLAYING</span>
                                )}
                                </td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                )}

                {/* TAB 2: LIVE MONITOR (PUZZLE ONLY) */}
                {activeTab === 'live' && imageUrl && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {players.map((player) => (
                            <div key={player.mobile} className="bg-gray-800 rounded-lg p-2 border border-gray-700 shadow-xl">
                                <div className="flex justify-between mb-2 text-xs">
                                    <span className="font-bold truncate w-20">{player.name}</span>
                                    <span className={player.finished ? "text-green-400" : "text-yellow-400"}>{player.finished ? "DONE" : "Active"}</span>
                                </div>


                                {/* Live Grid */}

                                {player.currentTiles && player.currentTiles.length > 0 ? (


                                    <div
                                        className="grid gap-0.5 bg-gray-900 p-0.5 mx-auto w-full aspect-square"
                                        style={{ gridTemplateColumns: `repeat(${difficulty}, 1fr)` }}
                                    >
                                        {player.currentTiles.map((tileVal, idx) => {
                                            // We assume the mini-grid is 100% width of its parent container.
                                            // But for pixel math, percentages are safer for responsive mini-grids.
                                            // HOWEVER, to fix the repeat issue, we use specific background size logic:

                                            const size = parseInt(difficulty);
                                            const col = tileVal % size;
                                            const row = Math.floor(tileVal / size);

                                            // For responsive mini-grids, percentages are tricky but let's fix the "Repeat" issue
                                            return (
                                                <div key={idx} style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundImage: `url(${imageUrl})`,
                                                    // This makes the image size = (GridSize * 100%) of the *TILE*.
                                                    // e.g. 3x3 grid -> 300% size.
                                                    backgroundSize: `${size * 100}% ${size * 100}%`,

                                                    // Classic Percentage Math (Works if Size is set correctly)
                                                    backgroundPosition: `${col * (100 / (size - 1))}% ${row * (100 / (size - 1))}%`,

                                                    backgroundRepeat: 'no-repeat' // ✅ Vital Fix
                                                }} />
                                            );
                                        })}
                                    </div>


                                ) : (
                                    <div className="aspect-square bg-gray-700 flex items-center justify-center text-gray-500 text-xs">No Data</div>
                                )}


                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminRoom;
