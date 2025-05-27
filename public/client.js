const socket = io();

// Hilfsfunktionen
function getParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// Lobbyseite
if (location.pathname.endsWith('lobby.html')) {
  const lobbyCode = getParam('code');
  const playerName = getParam('name');

  if (!lobbyCode || !playerName) {
    alert('Fehlende Daten!');
    location.href = '/';
  }

  document.getElementById('lobbyCode').textContent = lobbyCode;
  socket.emit('joinLobby', { lobbyCode, playerName });

  socket.on('playerList', (players) => {
    const list = document.getElementById('players');
    list.innerHTML = '';
    players.forEach(p => {
      const li = document.createElement('li');
      li.textContent = p.name;
      list.appendChild(li);
    });
  });

  socket.on('gameStarted', ({ role, word }) => {
    const url = `game.html?role=${role}&word=${encodeURIComponent(word || '')}`;
    location.href = url;
  });

  socket.on('errorMsg', (msg) => {
    alert(msg);
    location.href = '/';
  });

  window.startGame = function () {
    socket.emit('startGame', lobbyCode);
  };
}

// Startseite
if (location.pathname.endsWith('index.html') || location.pathname === '/') {
  window.createLobby = function () {
    const name = document.getElementById('playerName').value.trim();
    if (!name) return alert('Bitte gib deinen Namen ein.');

    socket.emit('createLobby', name);
    socket.once('lobbyCreated', ({ lobbyCode }) => {
      location.href = `lobby.html?code=${lobbyCode}&name=${encodeURIComponent(name)}`;
    });
  };

  window.joinLobby = function () {
    const name = document.getElementById('playerName').value.trim();
    const code = document.getElementById('lobbyCode').value.trim().toUpperCase();
    if (!name || !code) return alert('Bitte Name und Code eingeben!');
    location.href = `lobby.html?code=${code}&name=${encodeURIComponent(name)}`;
  };
}
