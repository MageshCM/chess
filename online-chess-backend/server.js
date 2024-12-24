// Required dependencies
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Chess } = require('chess.js');
const cors = require('cors');

// Initialize Express app and create HTTP server
const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS settings
const io = new Server(server, {
 cors: {
   origin: "*", // Allow connections from any origin
   methods: ["GET", "POST"]
 }
});

// Store active chess games
const games = {};

// Enable CORS for all routes
app.use(cors());

// Handle socket connections
io.on('connection', (socket) => {
 console.log('Player connected:', socket.id);

 // Handle game room joining
 socket.on('join-game', (gameId) => {
   // Create new chess game if doesn't exist
   if (!games[gameId]) {
     games[gameId] = new Chess();
   }
   socket.join(gameId);
   console.log(`Player ${socket.id} joined game ${gameId}`);
 });

 // Handle game reset request
 socket.on('reset-game', (gameId) => {
   games[gameId] = new Chess(); // Create fresh game instance
   io.to(gameId).emit('update-board', games[gameId].fen()); // Broadcast new board state
 });

 // Handle move attempts
 socket.on('move', (gameId, move) => {
   try {
     const game = games[gameId];
     if (!game) throw new Error('Game not found');
     
     // Attempt move and broadcast if legal
     if (game.move(move)) {
       io.to(gameId).emit('update-board', game.fen());
     } else {
       socket.emit('illegal-move', move);
     }
   } catch (error) {
     socket.emit('error', error.message);
   }
 });

 // Clean up on disconnect
 socket.on('disconnect', () => {
   console.log('Player disconnected:', socket.id);
 });
});

// Start server
server.listen(3001, '0.0.0.0', () => {
  console.log('Server running on http://192.168.1.12:3001');
});