// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Network Helper
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/';
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, 'puzzle-' + Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// Store Room Data
const gameRooms = {}; 

// --- RESET LOGIC ---
const resetRoomStats = (eventId, gameType) => {
    if (!gameRooms[eventId]) return;
    
    // Set Active Game Mode
    gameRooms[eventId].activeGame = gameType;

    // Reset Player Stats Completely
    gameRooms[eventId].players.forEach(p => {
        p.score = 0;
        p.timeTaken = 0;
        p.finished = false;
        p.finishedAt = '-';
        p.currentTiles = []; 
        // Mark them as participating in THIS game type
        p.activeIn = gameType; 
    });
};

// --- PUZZLE START ---
app.post('/upload-puzzle', upload.single('image'), (req, res) => {
  const eventId = req.body.eventId;
  const gridSize = parseInt(req.body.difficulty || 3); 

  if (!req.file || !eventId) return res.status(400).send('Error');

  const localIp = getLocalIpAddress();
  const imageUrl = `http://${localIp}:3001/uploads/${req.file.filename}`;

  if (!gameRooms[eventId]) gameRooms[eventId] = { players: [], imageUrl: null, activeGame: 'lobby' };
  
  // 1. Reset everything for Puzzle
  resetRoomStats(eventId, 'puzzle');

  gameRooms[eventId].imageUrl = imageUrl;
  gameRooms[eventId].gridSize = gridSize;

  // 2. Broadcast Start
  io.to(eventId).emit('puzzle_start', { imageUrl, gridSize });
  
  // 3. Update Admin
  io.to(eventId).emit('player_list_update', gameRooms[eventId].players);

  res.json({ success: true, imageUrl });
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // --- JOIN LOBBY ---
  socket.on('join_room', (data) => {
    const { eventId, user } = data; 
    socket.join(eventId);

    if (!gameRooms[eventId]) gameRooms[eventId] = { players: [], imageUrl: null, activeGame: 'lobby' };
    
    if (user.type !== 'admin') {
      const existingPlayer = gameRooms[eventId].players.find(p => p.mobile === user.mobile);
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        // If re-joining during a game, allow them back in
        if(gameRooms[eventId].activeGame !== 'lobby') {
             existingPlayer.activeIn = gameRooms[eventId].activeGame;
        }
      } else {
        // New Player joins LOBBY (not active in game yet)
        gameRooms[eventId].players.push({ 
          ...user, 
          socketId: socket.id, 
          score: 0, 
          timeTaken: 0,
          finished: false,
          activeIn: 'lobby' // Waiting state
        });
      }
    }
    io.to(eventId).emit('player_list_update', gameRooms[eventId].players);

    // If Puzzle is LIVE, auto-join them
    if (gameRooms[eventId].activeGame === 'puzzle' && gameRooms[eventId].imageUrl) {
        socket.emit('puzzle_start', { 
            imageUrl: gameRooms[eventId].imageUrl, 
            gridSize: gameRooms[eventId].gridSize 
        });
    }
  });

  // --- START QUIZ ---
  socket.on('start_game', (eventId) => {
    if (!gameRooms[eventId]) return;

    // 1. Reset for Quiz
    resetRoomStats(eventId, 'quiz');
    gameRooms[eventId].imageUrl = null; 
    
    // 2. Broadcast
    io.to(eventId).emit('game_started'); 
    
    // 3. Update Admin
    io.to(eventId).emit('player_list_update', gameRooms[eventId].players);
  });

  // --- LIVE MOVES ---
  socket.on('player_move', (data) => {
    const { eventId, tiles, mobile } = data;
    if (!gameRooms[eventId] || gameRooms[eventId].activeGame !== 'puzzle') return;

    const player = gameRooms[eventId].players.find(p => String(p.mobile) === String(mobile));
    if (player) {
        player.currentTiles = tiles;
        io.to(eventId).emit('admin_live_update', { mobile, tiles });
    }
  });

  // --- SUBMIT SCORE ---
  socket.on('submit_score', (data) => {
    const { eventId, score, timeTaken, mobile } = data;
    if (!gameRooms[eventId]) return;

    const player = gameRooms[eventId].players.find(p => String(p.mobile) === String(mobile));
    if (player) {
        player.score = score;
        player.timeTaken = timeTaken;
        player.finished = true;
        player.finishedAt = new Date().toLocaleTimeString(); 

        // Sort Leaderboard
        const sortedLeaderboard = [...gameRooms[eventId].players]
            .filter(p => p.activeIn === gameRooms[eventId].activeGame) // Only sort active players
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.timeTaken - b.timeTaken;
            });

        io.to(eventId).emit('leaderboard_update', sortedLeaderboard);
    }
  });
});

server.listen(3001, '0.0.0.0', () => {
  console.log(`SERVER RUNNING on port 3001 (IP: ${getLocalIpAddress()})`);
});