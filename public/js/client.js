const socket = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

const paddleContainer = document.getElementById("paddleContainer");

let myPlayerId = null;
let lobbyState = null;

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

    lobbyState = "lobby";
    updateStartButton();
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
            if(lobbyState != "lobby") return;
            sendMessage({
                type: "lobbyPointer",
                pointerUp: true,
                playerId: myPlayerId
            });
        }

        pointer.onmouseout = () => {
            if(lobbyState != "lobby") return;
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

    if(lobbyState == "lobby") updateStartButton();
}


function removePlayerFromLobby(playerId) {

    const playerText = document.getElementById(
        `lobbyPlayer${playerId}`
    );

    if (playerText) {
        playerText.remove();
    }

    if(lobbyState == "lobby") updateStartButton();
}

function updateStartButton() {
    if(document.getElementById("playersInLobby").children[2].id == "lobbyPlayer" + myPlayerId) {
        document.getElementById("lobbyStartBtn").classList.remove("disabled");
        if(document.getElementById("playersInLobby").children.length <= 3) {
            document.getElementById("lobbyStartBtn").disabled = true;
        } else {
            document.getElementById("lobbyStartBtn").disabled = false;
        }
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
    location.reload();
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
    lobbyState = "game";

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

var currentTool = "brush";
var brushSize = 4;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const cursorCanvas = document.getElementById("cursorCanvas");
const cursorCtx = cursorCanvas.getContext("2d");

let painting = false;
let lastX = null;
let lastY = null;


// Get mouse position in canvas coordinates
function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) * canvas.width / rect.width,
        y: (event.clientY - rect.top) * canvas.height / rect.height
    };
}


// Start drawing
canvas.addEventListener("mousedown", (event) => {
    painting = true;
    draw(event);
});


// Stop drawing
canvas.addEventListener("mouseup", () => {
    painting = false;
    lastX = null;
    lastY = null;
});


// Stop drawing if mouse leaves canvas
canvas.addEventListener("mouseleave", () => {
    painting = false;
    lastX = null;
    lastY = null;

    cursorCtx.clearRect(
        0,
        0,
        cursorCanvas.width,
        cursorCanvas.height
    );
});


// Mouse movement
canvas.addEventListener("mousemove", (event) => {
    moveCursor(event);

    if (painting) {
        draw(event);
    }
});


// Show cursor when entering
canvas.addEventListener("mouseenter", (event) => {
    moveCursor(event);
});


// Draw on painting canvas
function draw(event) {
    const pos = getCanvasPosition(event);

    ctx.strokeStyle =
        currentTool === "eraser" ? "white" : "black";

    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (lastX === null) {
        lastX = pos.x;
        lastY = pos.y;
    }

    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    lastX = pos.x;
    lastY = pos.y;
}


// Draw the brush-size indicator
function moveCursor(event) {
    const pos = getCanvasPosition(event);

    // Clear previous cursor
    cursorCtx.clearRect(
        0,
        0,
        cursorCanvas.width,
        cursorCanvas.height
    );

    cursorCtx.beginPath();

    cursorCtx.arc(
        pos.x,
        pos.y,
        brushSize / 2,
        0,
        Math.PI * 2
    );

    cursorCtx.strokeStyle = "black"

    cursorCtx.lineWidth = 1;
    cursorCtx.stroke();
}


function startPainting() {
    setBrush("brush");

    document.getElementById("writingContainer").classList.add("disabled");
    document.getElementById("paintingContainer").classList.remove("disabled");

    document.getElementById("top").className = "painting";
    document.getElementById("top").children[0].textContent = "Time Left: 2:00";

    document.getElementById("paintingPrompt").textContent =
        "Prompt: " + prompts[0];

    secondsLeft = 90;
    countTimer();
}

function saveAndClearPainting() {
    paintings.push(canvas.toDataURL("image/png"));
    ctx.clearRect(0,0,100,100);
}

function nextPrompt() {
    saveAndClearPainting();
    document.getElementById("paintingPrompt").textContent = "Prompt: " + prompts[1];
    if(paintings.length == 2 /* total paintings */ - 1) {
        document.getElementById("nextPrompt").classList.add("disabled");
    }
}

function setBrush(id) {
    const brush = document.getElementById("brush");
    const eraser = document.getElementById("eraser");

    brush.classList.remove("selected");
    eraser.classList.remove("selected");

    if(id == "brush") {
        brush.classList.add("selected");
    }
    if(id == "eraser") {
        eraser.classList.add("selected");
    }
    currentTool = id;
}

function endPainting() {
    saveAndClearPainting();
    setBrush("brush");
}

// bidding
var serverPaintings = [];
var hints = [];
var currentPainting = 0;

var topBid = 0;
var lastBidder = -1;
var lastBidderName = "";
var money = 0;

function initBidding() {
    document.getElementById("paintingContainer").classList.add("disabled");
    document.getElementById("lobbyContainer").classList.add("disabled");
    document.getElementById("gameContainer").classList.remove("disabled");
    document.getElementById("imageContainer").classList.remove("disabled");

    document.getElementById("mid").classList.remove("disabled");
    document.getElementById("right").classList.remove("disabled");

    document.getElementById("top").className = "bidding";
    document.getElementById("top").children[0].textContent = "Artwork 1/10";

    updateBidStatus();
}

function loadArtwork() {
    document.getElementById("imageBox").children[0].src = serverPaintings[currentPainting].img;
}

function updateBidStatus() {
    document.getElementById("top").children[0].textContent = `Artwork ${currentPainting + 1}/${serverPaintings.length}`;

    document.getElementById("topBid").textContent = `Top Bid: $${topBid.toLocaleString("en-us")}}`;
    document.getElementById("topBidder").textContent = `Top Bidder: ${lastBidderName ? lastBidderName : "N/A"}`;

    document.getElementById("raise1").textContent = `$${(topBid + 100).toLocaleString("en-us")}`;
    document.getElementById("raise2").textContent = `$${(topBid + 200).toLocaleString("en-us")}`;
    document.getElementById("raise3").textContent = `$${(topBid + 300).toLocaleString("en-us")}`;

    document.getElementById("money").textContent = `$${money.toLocaleString("en-us")}`;
}

function raise1() {
    submitBid(topBid + 100);
}

function raise2() {
    submitBid(topBid + 200);
}

function raise3() {
    submitBid(topBid + 300);
}

function submitBid(amount) {
    if(money < amount) {
        return;
    }
    if(amount <= topBid) {
        return;
    }
    if(lastBidder == myPlayerId) {
        return;
    }
    sendMessage({
        type: "sendBid",
        player: myPlayerId,
        bid: amount
    });
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

    if (message.type === "grabPaintings") {
        endPainting()
        var p = [];
        let pr = 0;
        paintings.forEach(painting => {
            p.push({
                img: painting,
                prompt: prompts[pr],
                artist: myPlayerId
            }); 
            pr++;
        })

        sendMessage({
            type: "paintings",
            playerId: myPlayerId,
            paintings: p
        });
    }

    if (message.type === "initBidding") {
        serverPaintings = message.paintings;
        hints = message.hints;
        money = message.startingMoney;
        currentPainting = 0;
        initBidding();
        loadArtwork();
    }

    if (message.type === "loadArtwork") {
        currentPainting = message.num;
        loadArtwork();
    }

    if (message.type === "bidProcessed") {
        topBid = message.bid;
        lastBidder = message.player.id;
        lastBidderName = message.player.name;
        updateBidStatus();
    }

    if (message.type === "updateMoney") {
        money = message.money;
    }

};


// Connection closed
socket.onclose = () => {
    console.log("Disconnected from server");
};