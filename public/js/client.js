const socket = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

const paddleContainer = document.getElementById("paddleContainer");

let myPlayerId = null;

/*
█░░ █▀█ █▀▀ ▄▀█ █░░   █▀▀ █░█ █▄░█ █▀▀ ▀█▀ █ █▀█ █▄░█ █▀
█▄▄ █▄█ █▄▄ █▀█ █▄▄   █▀░ █▄█ █░▀█ █▄▄ ░█░ █ █▄█ █░▀█ ▄█
*/

// main menu
function createLobby() {
    sendMessage({
        type: "createLobby"
    });
}

function backLobby() {
    document.getElementById("top").children[0].textContent = "Money for Babies";
    document.getElementById("top").className = "";
    document.getElementById("joinContainer").classList.remove("disabled");

    document.getElementById("createBtn").classList.remove("disabled");
    document.getElementById("joinBtn").classList.remove("disabled");
    document.getElementById("goInput").classList.add("disabled");
    document.getElementById("goBtn").classList.add("disabled");
    document.getElementById("backBtn").classList.add("disabled");

    document.getElementById("paintingContainer").classList.add("disabled");
    document.getElementById("writingContainer").classList.add("disabled");
    document.getElementById("gameContainer").classList.add("disabled");

    document.getElementById("left").classList.add("disabled");
    document.getElementById("mid").classList.add("disabled");
    document.getElementById("right").classList.add("disabled");
    document.getElementById("lobbyStartBtn").classList.add("disabled");
}

function initJoinLobby() {
    document.getElementById("top").children[0].textContent = "Join a Lobby";
    document.getElementById("createBtn").classList.add("disabled");
    document.getElementById("joinBtn").classList.add("disabled");
    document.getElementById("goInput").classList.remove("disabled");
    document.getElementById("goBtn").classList.remove("disabled");
    document.getElementById("backBtn").classList.remove("disabled");
}

function joinLobby() {
    const code = document.getElementById("goInput").value.trim().toUpperCase();

    sendMessage({
        type: "joinLobby",
        code: code
    });
}

function enterGame(code) {
    document
        .getElementById("top")
        .className = "lobby"

    document
        .getElementById("top")
        .children[0].textContent = "Game Code: " + code

    document
        .getElementById("joinContainer")
        .classList.add("disabled")

    document
        .getElementById("gameContainer")
        .classList.remove("disabled")

    document
        .getElementById("left")
        .classList.remove("disabled")
}

// lobby
function addPointer(playerId) {
    // Don't add it twice
    if (document.getElementById(`pointer${playerId}`)) {
        return;
    }

    const pointer = document.createElement("img");

    pointer.id = `pointer${playerId}`;
    pointer.src = `img/pointer${playerId}.png`;

    if(playerId == myPlayerId) {
        pointer.onmouseover = () => {
            sendMessage({
                type: "lobbyPointer",
                pointerUp: true,
                playerId: myPlayerId
            });
        }

        pointer.onmouseout = () => {
            sendMessage({
                type: "lobbyPointer",
                pointerUp: false,
                playerId: myPlayerId
            });
        }
    }

    paddleContainer.appendChild(pointer);
}


function removePointer(playerId) {
    const pointer = document.getElementById(`pointer${playerId}`);

    if (pointer) {
        pointer.remove();
    }

    console.log(`Removed pointer ${playerId}`);
}

function raisePointer(playerId) {
    const pointer = document.getElementById(`pointer${playerId}`);

    if (pointer) {
        pointer.className = "raised";
    }
}

function lowerPointer(playerId) {
    const pointer = document.getElementById(`pointer${playerId}`);

    if (pointer) {
        pointer.className = "";
    }
}

const lobbyContainer = document.getElementById("lobbyContainer");
const infoBox = document.getElementById("playersInLobby");

function addPlayerToLobby(player) {

    if (document.getElementById(`lobbyPlayer${player.id}`)) {
        return;
    }

    const playerText = document.createElement("h2");

    playerText.id = `lobbyPlayer${player.id}`;
    playerText.textContent = player.name;
    playerText.className = `player${player.id}`;

    infoBox.appendChild(playerText);

    updateStartButton();
}


function removePlayerFromLobby(playerId) {

    const playerText = document.getElementById(
        `lobbyPlayer${playerId}`
    );

    if (playerText) {
        playerText.remove();
    }

    updateStartButton();
}

function updateStartButton() {
    if(document.getElementById("playersInLobby").children[2].id == "lobbyPlayer" + myPlayerId) {
        document.getElementById("lobbyStartBtn").classList.remove("disabled");
    } else {
        document.getElementById("lobbyStartBtn").classList.add("disabled");
    }
}

function leaveGame() {
    document.querySelectorAll("#paddleContainer img").forEach(pointer => pointer.remove());
    document.querySelectorAll('[id^="lobbyPlayer"]').forEach(player => player.remove());

    sendMessage({
        type: "leaveLobby"
    });
    backLobby();
}

//writing
function startGame() {
    sendMessage({
        type: "startGame"
    });
}

var secondsLeft;
var timerTimeout = null;

function startWriting() {
    document.getElementById("gameContainer").classList.add("disabled");
    document.getElementById("writingContainer").classList.remove("disabled");

    document.getElementById("lobbyStartBtn").classList.add("disabled");

    document.getElementById("top").className = "writing";
    document.getElementById("top").children[0].textContent = "Time Left: 0:20";

    secondsLeft = 20;
    countTimer();
}

function countTimer() {
    if(secondsLeft == 1) {
        timerTimeout = null;
        return;
    }

    timerTimeout = setTimeout(() => {
        secondsLeft--;
        updateTimer();
        countTimer();
    }, 1000);
}

function updateTimer() {
    document.getElementById("top").children[0].textContent = "Time Left: " + Math.floor(secondsLeft / 60) + ":" + (secondsLeft % 60 < 10 ? "0" : "") + (secondsLeft % 60);
} 

//painting
var prompts = [];
var paintings = [];

function startPainting() {
    document.getElementById("writingContainer").classList.add("disabled");
    document.getElementById("paintingContainer").classList.remove("disabled");

    document.getElementById("top").className = "painting";
    document.getElementById("top").children[0].textContent = "Time Left: 2:00";

    document.getElementById("paintingPrompt").textContent = "Prompt: " + prompts[0];

    secondsLeft = 120;
    countTimer();
}

function saveAndClearPainting() {
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");

    paintings.push(canvas.toDataURL("image/png"));
    ctx.clearRect(0,0,100,100);
}

function nextPrompt() {
    saveAndClearPainting();
    document.getElementById("paintingPrompt").textContent = "Prompt: " + prompts[1];
}

/*
█▀ █▀▀ █▀█ █░█ █▀▀ █▀█   █▀▀ █▀█ █▀▄▀█ █▀▄▀█ █░█ █▄░█ █ █▀▀ ▄▀█ ▀█▀ █ █▀█ █▄░█
▄█ ██▄ █▀▄ ▀▄▀ ██▄ █▀▄   █▄▄ █▄█ █░▀░█ █░▀░█ █▄█ █░▀█ █ █▄▄ █▀█ ░█░ █ █▄█ █░▀█
*/

function sendMessage(contents) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(contents));
    } else {
        console.log("Cannot send message: WebSocket is not connected.");
    }
}

// WebSocket connected
socket.onopen = () => {

    console.log("Connected to server");

};


// Receive server messages
socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("Received:", message);

    if (message.type === "serverFull") {
        alert("This server is full!");
        return;
    }

    if (message.type === "players") {

        myPlayerId = message.yourId;

        console.log("My player ID:", myPlayerId);

        // Add all existing players
        message.players.forEach(player => {
            addPointer(player.id);
            addPlayerToLobby(player);
        });

        return;
    }

    if (message.type === "playerJoined") {
        addPointer(message.player.id);
        addPlayerToLobby(message.player);
        return;
    }

    if (message.type === "playerLeft") {
        removePointer(message.playerId);
        removePlayerFromLobby(message.playerId);
        return;
    }

    if (message.type === "lobbyJoined") {

        myPlayerId = message.yourId;

        console.log("My player ID:", myPlayerId);

        // Add all players currently in the lobby
        message.players.forEach(player => {
            addPointer(player.id);
            addPlayerToLobby(player);
        });

        enterGame(message.code);

        return;
    }

    if (message.type === "lobbyPointer") {
        if(message.pointerUp) {
            raisePointer(message.playerId);
        } else {
            lowerPointer(message.playerId);
        }
        return;
    }

    // Player data changed
    if (message.type === "playerUpdated") {
        console.log(
            "Player updated:",
            message.player
        );
        return;
    }

    if (message.type === "gameStarted") {
        startWriting();
    }

    if (message.type === "grabPrompts") {
        sendMessage({
            type: "prompts",
            playerId: myPlayerId,
            prompts: [
                document.getElementById("prompt1").value.trim().toUpperCase(),
                document.getElementById("prompt2").value.trim().toUpperCase()
            ]
        });
    }

    if (message.type === "startPainting") {
        prompts = message.prompts;
        startPainting();
    }

};


// Connection closed
socket.onclose = () => {
    console.log("Disconnected from server");
};