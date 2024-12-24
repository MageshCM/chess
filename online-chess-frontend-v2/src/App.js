import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';

function App() {
 // Game state management
 const [game, setGame] = useState(new Chess());
 const [status, setStatus] = useState('Waiting for opponent...');
 const [isMyTurn, setIsMyTurn] = useState(true);
 const [socket, setSocket] = useState(null);
 const [isConnected, setIsConnected] = useState(false);
 const gameId = 'game123'; // Unique game identifier

 // Initialize socket connection
 useEffect(() => {
   const newSocket = io('http://192.168.1.12:3001', {
     reconnection: true,
     reconnectionDelay: 1000,
   });
   
   setSocket(newSocket);
   
   return () => newSocket.disconnect();
 }, []);

 // Socket event handlers
 useEffect(() => {
   if (!socket) return;
   
   socket.on('connect', () => setIsConnected(true));
   socket.on('disconnect', () => setIsConnected(false));
   socket.emit('join-game', gameId);

   // Update board state when move is received
   socket.on('update-board', (fen) => {
     const updatedGame = new Chess(fen);
     setGame(updatedGame);
     checkGameStatus(updatedGame);
     setIsMyTurn(updatedGame.turn() === 'w');
   });

   // Handle illegal moves and errors
   socket.on('illegal-move', () => {
     alert('Illegal move attempted!');
   });

   socket.on('error', (message) => {
     alert(`Error: ${message}`);
   });
   
   // Cleanup socket listeners
   return () => {
     socket.off('connect');
     socket.off('disconnect');
     socket.off('update-board');
     socket.off('illegal-move');
     socket.off('error');
   };
 }, [socket]);

 // Check for checkmate, draws, and check conditions
 function checkGameStatus(chess) {
   if (chess.isCheckmate()) {
     setStatus(`Checkmate! ${chess.turn() === 'w' ? 'Black' : 'White'} wins!`);
   } else if (chess.isDraw()) {
     if (chess.isStalemate()) {
       setStatus('Game Over - Stalemate!');
     } else if (chess.isThreefoldRepetition()) {
       setStatus('Game Over - Draw by repetition!');
     } else if (chess.isInsufficientMaterial()) {
       setStatus('Game Over - Draw by insufficient material!');
     } else {
       setStatus('Game Over - Draw!');
     }
   } else if (chess.isCheck()) {
     setStatus(`${chess.turn() === 'w' ? 'White' : 'Black'} is in check!`);
   } else {
     setStatus(`Current turn: ${chess.turn() === 'w' ? 'White' : 'Black'}`);
   }
 }

 // Handle piece movement
 function onDrop(sourceSquare, targetSquare) {
   if (!socket || !isConnected) {
     alert('Not connected to server!');
     return false;
   }

   if (!isMyTurn) {
     alert('Not your turn!');
     return false;
   }

   const move = game.move({
     from: sourceSquare,
     to: targetSquare,
     promotion: 'q', // Auto-promote to queen
   });

   if (move) {
     setGame(new Chess(game.fen()));
     setIsMyTurn(false);
     socket.emit('move', gameId, move);
     return true;
   }

   alert('Illegal move!');
   return false;
 }

 // Reset game state
 function resetGame() {
   if (!socket || !isConnected) {
     alert('Not connected to server!');
     return;
   }
   const newGame = new Chess();
   setGame(newGame);
   setStatus('Current turn: White');
   setIsMyTurn(true);
   socket.emit('reset-game', gameId);
 }

 return (
   <div className="App">
     <header className="App-header">
       <h1>Online Chess Game</h1>
       <div className="status-message" style={{ margin: '20px 0', fontSize: '1.2rem', color: 'white' }}>
         {status}
         {!isConnected && <div style={{color: 'red'}}>Disconnected from server</div>}
       </div>
       <Chessboard
         position={game.fen()}
         onPieceDrop={onDrop}
         boardWidth={560}
       />
       <button
         onClick={resetGame}
         style={{
           marginTop: '20px',
           padding: '10px 20px',
           fontSize: '1rem',
           backgroundColor: '#4CAF50',
           color: 'white',
           border: 'none',
           borderRadius: '4px',
           cursor: 'pointer',
         }}
       >
         New Game
       </button>
     </header>
   </div>
 );
}

export default App;