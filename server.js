// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

const lobbies = {};

function getWord() {
  const words = ['Pizza', 'Zug', 'Kino', 'Wald', 'Museum', 'Buch', 'Insel'];
  return words[Math.floor(Math.random() * words.length)];
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('createLobby', (playerName) => {
    const lobbyCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    const word = getWord();

    lobbies[lobbyCode] = {
      players: [],
      word,
      imposters: [],
      started: false,
    };

    const player = { id: socket.id, name: playerName };
    lobbies[lobbyCode].players.push(player);
    socket.join(lobbyCode);
    socket.emit('lobbyCreated', { lobbyCode });
    io.to(lobbyCode).emit('playerList', lobbies[lobbyCode].players);
  });

  socket.on('joinLobby', ({ lobbyCode, playerName }) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby || lobby.players.length >= 15 || lobby.started) {
      socket.emit('errorMsg', 'Lobby nicht verfügbar');
      return;
    }

    const player = { id: socket.id, name: playerName };
    lobby.players.push(player);
    socket.join(lobbyCode);
    io.to(lobbyCode).emit('playerList', lobby.players);
  });

  socket.on('startGame', (lobbyCode) => {
    const lobby = lobbies[lobbyCode];
    if (!lobby || lobby.started) return;
    if (lobby.players.length < 3) return;

    lobby.started = true;

    const numImposters = lobby.players.length >= 9 ? 2 : 1;
    const shuffled = lobby.players.slice().sort(() => 0.5 - Math.random());
    lobby.imposters = shuffled.slice(0, numImposters).map((p) => p.id);

    lobby.players.forEach((player) => {
      const isImposter = lobby.imposters.includes(player.id);
      io.to(player.id).emit('gameStarted', {
        role: isImposter ? 'Imposter' : 'Nicht-Imposter',
        word: isImposter ? null : lobby.word,
      });
    });
  });

  socket.on('disconnect', () => {
    for (const code in lobbies) {
      const lobby = lobbies[code];
      const index = lobby.players.findIndex((p) => p.id === socket.id);
      if (index !== -1) {
        lobby.players.splice(index, 1);
        io.to(code).emit('playerList', lobby.players);
        if (lobby.players.length === 0) delete lobbies[code];
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
