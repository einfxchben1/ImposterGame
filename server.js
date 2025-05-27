const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));

const lobbies = new Map();

function getRandomWord() {
  const words = ['Pizza', 'Zug', 'Kino', 'Wald', 'Museum', 'Buch', 'Insel'];
  return words[Math.floor(Math.random() * words.length)];
}

function generateLobbyCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on('connection', (socket) => {
  socket.on('createLobby', (playerName) => {
    let lobbyCode;
    do {
      lobbyCode = generateLobbyCode();
    } while (lobbies.has(lobbyCode));

    const word = getRandomWord();
    const lobby = {
      players: [],
      word,
      imposters: [],
      started: false
    };

    const player = { id: socket.id, name: playerName };
    lobby.players.push(player);
    lobbies.set(lobbyCode, lobby);

    socket.join(lobbyCode);
    socket.emit('lobbyCreated', { lobbyCode });
    io.to(lobbyCode).emit('playerList', lobby.players);
  });

  socket.on('joinLobby', ({ lobbyCode, playerName }) => {
    const code = lobbyCode.toUpperCase();
    const lobby = lobbies.get(code);

    if (!lobby || lobby.started || lobby.players.length >= 15) {
      socket.emit('errorMsg', 'Lobby nicht gefunden oder bereits gestartet.');
      return;
    }

    const player = { id: socket.id, name: playerName };
    lobby.players.push(player);
    socket.join(code);
    io.to(code).emit('playerList', lobby.players);
  });

  socket.on('startGame', (lobbyCode) => {
    const code = lobbyCode.toUpperCase();
    const lobby = lobbies.get(code);
    if (!lobby || lobby.started || lobby.players.length < 3) return;

    lobby.started = true;
    const impostersNeeded = lobby.players.length >= 9 ? 2 : 1;
    const shuffled = [...lobby.players].sort(() => 0.5 - Math.random());
    lobby.imposters = shuffled.slice(0, impostersNeeded).map(p => p.id);

    lobby.players.forEach(player => {
      const isImposter = lobby.imposters.includes(player.id);
      io.to(player.id).emit('gameStarted', {
        role: isImposter ? 'Imposter' : 'Nicht-Imposter',
        word: isImposter ? null : lobby.word
      });
    });
  });

  socket.on('disconnect', () => {
    for (const [code, lobby] of lobbies.entries()) {
      const index = lobby.players.findIndex(p => p.id === socket.id);
      if (index !== -1) {
        lobby.players.splice(index, 1);
        io.to(code).emit('playerList', lobby.players);
        if (lobby.players.length === 0) {
          lobbies.delete(code);
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));
