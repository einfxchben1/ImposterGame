const socket = io();
const startBtn = document.getElementById("startBtn");
const info = document.getElementById("info");

startBtn.addEventListener("click", () => {
    socket.emit("startGame");
});

socket.on("role", (word) => {
    if (word) {
        info.textContent = `Dein Wort ist:\n📘 ${word}`;
    } else {
        info.textContent = `Du bist der Imposter!\n🕵️ Kein Wort für dich.`;
    }
});

socket.on("message", msg => {
    alert(msg);
});

socket.on("gameStarted", ({ playerCount }) => {
    startBtn.style.display = "none";
    console.log(`Spiel gestartet mit ${playerCount} Spielern.`);
});
