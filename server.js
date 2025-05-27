const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let players = {};
let imposterId = null;
let gameWord = null;

const WORDS = ["Banane", "Auto", "Pizza", "Hund", "Feuer", "Buch", "Strand"];

io.on("connection", (socket) => {
    console.log(`Spieler verbunden: ${socket.id}`);
    players[socket.id] = { word: null };

    socket.on("startGame", () => {
        const playerIds = Object.keys(players);
        if (playerIds.length < 3) {
            io.emit("message", "Mindestens 3 Spieler notwendig.");
            return;
        }

        imposterId = playerIds[Math.floor(Math.random() * playerIds.length)];
        gameWord = WORDS[Math.floor(Math.random() * WORDS.length)];

        playerIds.forEach(id => {
            players[id].word = id === imposterId ? null : gameWord;
            io.to(id).emit("role", players[id].word);
        });

        io.emit("gameStarted", { playerCount: playerIds.length });
        console.log(`Spiel gestartet. Imposter: ${imposterId}, Wort: ${gameWord}`);
    });

    socket.on("disconnect", () => {
        console.log(`Spieler getrennt: ${socket.id}`);
        delete players[socket.id];
        if (socket.id === imposterId) {
            imposterId = null;
            gameWord = null;
        }
    });
});

http.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
