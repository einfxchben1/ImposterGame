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
  console.log('📥 Verbindung:', socket.id);

  socket.on('createLobby', (playerName) => {
    let code;
    do {
      code = generateLobbyCode();
    } while (lobbies.has(code));

    const word = getRandomWord();

    const lobby = {
      players: [],
      imposters: [],
      word,
      started: false
    };

    const player = { id: socket.id, name: playerName };
    lobby.players.push(player);
    lobbies.set(code, lobby);

    socket.join(code);
    socket.emit('lobbyCreated', { lobbyCode: code });
    io.to(code).emit('playerList', lobby.players);
  });

  socket.on('joinLobby', ({ lobbyCode, playerName }) => {
    const code = lobbyCode.toUpperCase();
    const lobby = lobbies.get(code);

    if (!lobby) {
      socket.emit('errorMsg', 'Lobby nicht gefunden.');
      return;
    }

    if (lobby.started) {
      socket.emit('errorMsg', 'Das Spiel wurde bereits gestartet.');
      return;
    }

    if (lobby.players.length >= 15) {
      socket.emit('errorMsg', 'Diese Lobby ist voll.');
      return;
    }

    const alreadyJoined = lobby.players.find(p => p.id === socket.id);
    if (!alreadyJoined) {
      const player = { id: socket.id, name: playerName };
      lobby.players.push(player);
      socket.join(code);
    }

    io.to(code).emit('playerList', lobby.players);
  });

 socket.on('startGame', (lobbyCode) => {
  const code = lobbyCode.toUpperCase();
  const lobby = lobbies.get(code);

  if (!lobby) return;
  if (lobby.started) return;
  if (lobby.players.length < 3) {
    io.to(socket.id).emit('errorMsg', 'Mindestens 3 Spieler nötig, um das Spiel zu starten.');
    return;
  }

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

server.listen(PORT, () => {
  console.log(`🚀 Server läuft auf http://localhost:${PORT}`);
});
