import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';

const PuzzleGame = () => {
  const socket = useSocket();
  const navigate = useNavigate();

  // Dynamic State
  const [gridSize, setGridSize] = useState(3);
  const [tiles, setTiles] = useState([]);
  const [imageUrl, setImageUrl] = useState(null);
  
  const [selectedTileIndex, setSelectedTileIndex] = useState(null);
  const [isFinished, setIsFinished] = useState(false);
  const [moves, setMoves] = useState(0);
  const startTimeRef = useRef(0);
  const [finalScore, setFinalScore] = useState(null);

  const userDetails = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
  const eventId = sessionStorage.getItem('currentEventId');

  // CONSTANTS FOR PIXEL MATH
  const CONTAINER_SIZE = 340; // Total size in pixels

  const startNewGame = useCallback((size) => {
    const total = size * size;
    const solvedState = Array.from({ length: total }, (_, i) => i);
    let shuffled = [...solvedState];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setTiles(shuffled);
    setIsFinished(false);
    setMoves(0);
    setFinalScore(null);
    startTimeRef.current = new Date().getTime();
  }, []);

  const startPuzzleFromData = useCallback((data) => {
    if (!data?.imageUrl) return;
    const parsedSize = parseInt(data.gridSize, 10);
    const normalizedSize = Number.isNaN(parsedSize) ? 3 : parsedSize;
    setImageUrl(data.imageUrl);
    setGridSize(normalizedSize);
    startNewGame(normalizedSize);
    sessionStorage.setItem('activePuzzle', JSON.stringify({
      imageUrl: data.imageUrl,
      gridSize: normalizedSize
    }));
  }, [startNewGame]);

  useEffect(() => {
    if (!eventId || !userDetails.name) {
      alert("Please login first!");
      navigate('/');
      return;
    }

    const storedPuzzle = sessionStorage.getItem('activePuzzle');
    if (storedPuzzle) {
      try {
        const parsed = JSON.parse(storedPuzzle);
        // Hydrate immediately so late joiners start with an active shuffle
        // eslint-disable-next-line react-hooks/set-state-in-effect
        startPuzzleFromData(parsed);
      } catch (error) {
        console.error('Failed to hydrate puzzle from storage', error);
      }
    }

    if (socket) {
      socket.emit('join_room', { eventId, user: userDetails });

      socket.on('puzzle_start', (data) => {
        startPuzzleFromData(data);
      });
    }

    return () => {
      if (socket) socket.off('puzzle_start');
    };
  }, [socket, eventId, navigate, userDetails, startPuzzleFromData]);

  const handleTileClick = (index) => {
    if (isFinished || !imageUrl) return;
    if (selectedTileIndex === null) {
      setSelectedTileIndex(index);
    } else {
      if (selectedTileIndex !== index) swapTiles(selectedTileIndex, index);
      setSelectedTileIndex(null);
    }
  };

  const swapTiles = (indexA, indexB) => {
    const newTiles = [...tiles];
    [newTiles[indexA], newTiles[indexB]] = [newTiles[indexB], newTiles[indexA]];
    setTiles(newTiles);
    setMoves(prev => prev + 1);
    
    // Send Move
    if (socket && eventId) {
        socket.emit('player_move', { 
            eventId, 
            tiles: newTiles, 
            mobile: userDetails.mobile 
        });
    }

    if (newTiles.every((val, index) => val === index)) {
      finishGame();
    }
  };

  const finishGame = () => {
    const timeTaken = (new Date().getTime() - startTimeRef.current) / 1000;
    setIsFinished(true);
    const baseScore = gridSize === 6 ? 20000 : gridSize === 4 ? 10000 : 5000;
    const calculatedScore = Math.max(0, baseScore - (moves * 50) - (Math.floor(timeTaken) * 10));
    setFinalScore(calculatedScore);

    if (socket && eventId) {
      socket.emit('submit_score', { 
        eventId, 
        score: calculatedScore, 
        timeTaken, 
        mobile: userDetails.mobile, 
        userName: userDetails.name 
      });
    }
  };

  if (!imageUrl) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p>Waiting for Admin to start...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      
      {!isFinished && <h2 className="text-white text-xl mb-2 font-bold">Tap to Swap ({gridSize}x{gridSize})</h2>}

      {!isFinished && (
        <div className="mb-4 flex flex-col items-center">
            <span className="text-gray-400 text-xs mb-1 uppercase tracking-widest">Target Image</span>
            <img src={imageUrl} alt="Target" className="w-24 h-24 object-cover rounded-lg border border-gray-600 shadow-md"/>
        </div>
      )}

      {isFinished && (
        <div className="bg-green-600 text-white p-4 rounded-lg shadow-lg mb-6 w-full max-w-[340px] text-center animate-fade-in-down border-2 border-green-400">
           <h1 className="text-3xl font-bold mb-1">🎉 Solved!</h1>
           <div className="flex justify-between mt-2 text-sm font-semibold bg-green-800/50 p-2 rounded">
              <span>Moves: {moves}</span>
              <span className="text-yellow-300">Score: {finalScore}</span>
           </div>
           <p className="text-xs text-green-200 mt-2">Check the big screen for your rank!</p>
        </div>
      )}

      {/* PUZZLE GRID */}
      <div 
        className={`gap-0.5 bg-gray-700 p-1 rounded-lg shadow-2xl grid transition-all duration-500 ${isFinished ? 'border-4 border-green-500 shadow-green-500/50' : ''}`}
        style={{ 
          width: `${CONTAINER_SIZE}px`, 
          height: `${CONTAINER_SIZE}px`, 
          gridTemplateColumns: `repeat(${gridSize}, 1fr)` 
        }}
      >
        {tiles.map((tileNumber, index) => {
          // ✅ FIX: Use Exact Pixel Calculations
          const TILE_SIZE = CONTAINER_SIZE / gridSize;
          
          // Calculate which part of the image to show (X, Y coordinates)
          const col = tileNumber % gridSize;
          const row = Math.floor(tileNumber / gridSize);
          
          const bgPosX = -(col * TILE_SIZE);
          const bgPosY = -(row * TILE_SIZE);

          return (
            <div
              key={index}
              onClick={() => handleTileClick(index)}
              className={`w-full h-full cursor-pointer border-[1px] transition-all duration-200 ${selectedTileIndex === index ? 'border-yellow-400 z-10 scale-95' : 'border-transparent'}`}
              style={{
                backgroundImage: `url(${imageUrl})`,
                // Force image to be exactly the size of the container
                backgroundSize: `${CONTAINER_SIZE}px ${CONTAINER_SIZE}px`, 
                backgroundPosition: `${bgPosX}px ${bgPosY}px`,
                backgroundRepeat: 'no-repeat', // Prevent "Three Logos"
                cursor: isFinished ? 'default' : 'pointer'
              }}
            />
          );
        })}
      </div>

      {!isFinished && <div className="text-gray-400 mt-4">Moves: {moves}</div>}
    </div>
  );
};

export default PuzzleGame;