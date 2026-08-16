const socket = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

let myPlayerId = null;
let lobbyState = null;

if(localStorage.getItem("username")) {
    document.getElementById("username").value = localStorage.getItem("username");
}

/*
█░░ █▀█ █▀▀ ▄▀█ █░░   █▀▀ █░█ █▄░█ █▀▀ ▀█▀ █ █▀█ █▄░█ █▀
█▄▄ █▄█ █▄▄ █▀█ █▄▄   █▀░ █▄█ █░▀█ █▄▄ ░█░ █ █▄█ █░▀█ ▄█
*/

const sounds = {
    "click": new Audio('../audio/click.wav')
}

var heads = [];

for(let i = 0; i < 8; i++) {
    const a = new Image();
    a.src = `../img/head${i}.png`;
    heads.push(a.src);
}

console.log(heads);
// preload heads

function playsound(id) {
    const sound = sounds[id];
    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {});
}

// main menu
function createLobby() {
    playsound("click");
    sendMessage({
        type: "createLobby",
        username: localStorage.getItem("username") || ""
    });
}

function backLobby() {
    playsound("click");
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
    document.getElementById("username").classList.remove("disabled");
}

function initJoinLobby() {
    playsound("click");
    document.getElementById("top").children[0].textContent = "Join a Lobby";
    document.getElementById("createBtn").classList.add("disabled");
    document.getElementById("joinBtn").classList.add("disabled");
    document.getElementById("goInput").classList.remove("disabled");
    document.getElementById("goBtn").classList.remove("disabled");
    document.getElementById("backBtn").classList.remove("disabled");
}

function joinLobby() {
    playsound("click");
    const code = document.getElementById("goInput").value.trim().toUpperCase();

    sendMessage({
        type: "joinLobby",
        code: code,
        username: localStorage.getItem("username") || ""
    });
}

function enterGame(code) {
    document.getElementById("username").classList.add("disabled");

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

function updateUsername() {
    localStorage.setItem("username",document.getElementById("username").value.trim());
}

// lobby
const paddleContainer = document.getElementById("paddleContainer");
const pointerRaisedState = new Map();

function normalizeHeadNum(headNum) {
    const value = Number(headNum);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(7, Math.round(value)));
}

function getHeadImage(headNum) {
    return heads[headNum];
}

function setPointerHead(playerId, headNum) {
    const pointer = document.getElementById(`pointer${playerId}`);
    if (!pointer) return;

    const head = pointer.querySelector(".pointerHead");
    if (!head) return;

    const normalized = normalizeHeadNum(headNum);
    head.setAttribute("headNum", normalized);
    head.src = getHeadImage(normalized);
}

function addPointer(playerId, playerName, headNum = 0) {
    // Don't add it twice
    if (document.getElementById(`pointer${playerId}`)) {
        return;
    }

    // Container for the entire pointer
    const pointer = document.createElement("div");
    pointer.id = `pointer${playerId}`;
    pointer.className = "pointer";

    const label = document.createElement("div");
    label.className = "pointerLabel";
    label.textContent = playerName;

    // Player-specific shaft
    const shaft = document.createElement("img");
    shaft.className = "pointerShaft";
    shaft.src = `img/pointer${playerId}.png`;

    // Customizable head
    const head = document.createElement("img");
    head.className = "pointerHead";

    const normalizedHead = normalizeHeadNum(headNum);
    head.src = getHeadImage(normalizedHead);
    head.setAttribute("headNum", normalizedHead);

    const offsetXMap = [-14, 18, -6, -2, -18, -2, -2, -28];

    function loadPointer() {
        const pixelScale = shaft.clientWidth / shaft.naturalWidth;
        const h = normalizeHeadNum(head.getAttribute("headNum"));
        
        head.src = getHeadImage(h);
        if(head.naturalWidth * pixelScale || 0 != 0) head.style.width = `${head.naturalWidth * pixelScale}px`;
        head.style.transform =
            `translate(${offsetXMap[h] * pixelScale}px, ${8 * pixelScale}px)`;

        if(head.naturalWidth * pixelScale || 0 != 0) label.style.width = `${head.naturalWidth * pixelScale}px`;
        label.style.transform =
            `translate(${offsetXMap[h] * pixelScale}px, ${8 * pixelScale}px)`;

        requestAnimationFrame(loadPointer);
    }

    requestAnimationFrame(loadPointer);

    pointer.appendChild(label);
    pointer.appendChild(head);
    pointer.appendChild(shaft);

    if (playerId == myPlayerId) {
        pointer.onclick = () => {
            if (lobbyState != "lobby") return;

            playsound("click");

            sendMessage({
                type: "changeHead"
            });
        };

        pointer.onmouseenter = () => {
            if (lobbyState != "lobby") return;
            if (pointerRaisedState.get(playerId) === true) return;

            pointerRaisedState.set(playerId, true);
            sendMessage({
                type: "lobbyPointer",
                pointerUp: true,
                playerId: myPlayerId
            });
        };

        pointer.onmouseleave = () => {
            if (lobbyState != "lobby") return;
            if (pointerRaisedState.get(playerId) !== true) return;

            pointerRaisedState.set(playerId, false);
            sendMessage({
                type: "lobbyPointer",
                pointerUp: false,
                playerId: myPlayerId
            });
        };
    }

    paddleContainer.appendChild(pointer);
}


function removePointer(playerId) {
    const pointer = document.getElementById(`pointer${playerId}`);

    if (pointer) {
        pointer.remove();
    }
}

function raisePointer(playerId) {
    const pointer = document.getElementById(`pointer${playerId}`);

    if (pointer) {
        pointer.classList.add("raised");
        pointerRaisedState.set(playerId, true);
    }
}

function lowerPointer(playerId) {
    const pointer = document.getElementById(`pointer${playerId}`);

    if (pointer) {
        pointer.classList.remove("raised");
        pointerRaisedState.set(playerId, false);
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
    playsound("click");

    document.querySelectorAll("#paddleContainer img").forEach(pointer => pointer.remove());
    document.querySelectorAll('[id^="lobbyPlayer"]').forEach(player => player.remove());

    sendMessage({
        type: "leaveLobby"
    });
    backLobby();
    location.reload();
}

//writing
var secondsLeft = 0;
var timerEnd = 0;
var timerInterval = null;
var timerMode = null;

function startGame() {
    playsound("click");

    sendMessage({
        type: "startGame"
    });
}

function startWriting() {
    lobbyState = "game";

    document.getElementById("gameContainer").classList.add("disabled");
    document.getElementById("writingContainer").classList.remove("disabled");

    document.getElementById("lobbyStartBtn").classList.add("disabled");

    document.getElementById("top").className = "writing";

    startTimer(20);
}

// Start a timer using an absolute end time
function startTimer(seconds, mode = "normal") {
    clearInterval(timerInterval);

    timerMode = mode;
    timerEnd = Date.now() + seconds * 1000;

    updateTimerDisplay();

    timerInterval = setInterval(() => {
        updateTimerDisplay();

        if (Date.now() >= timerEnd) {
            clearInterval(timerInterval);
            timerInterval = null;
            secondsLeft = 0;
            updateTimerDisplay();
        }
    }, 100);
}

// Stop the current timer
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerEnd = 0;
    secondsLeft = 0;
}

// Get the actual amount of time remaining
function getSecondsLeft() {
    return Math.max(
        0,
        Math.ceil((timerEnd - Date.now()) / 1000)
    );
}

// Update the timer display
function updateTimerDisplay(head = "") {
    if (timerEnd <= 0) {
        secondsLeft = 0;
    } else {
        secondsLeft = getSecondsLeft();
    }

    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    const time =
        minutes + ":" + (seconds < 10 ? "0" : "") + seconds;

    if (head !== "") {
        document.getElementById("top").children[0].textContent =
            head + " - " + time;
    } else {
        document.getElementById("top").children[0].textContent =
            "Time Left: " + time;
    }
}

//painting
var prompts = [];
var paintings = [];

const colors = [
    "#000000",
    "#1D2B53",
    "#7E2553",
    "#008751",
    "#AB5236",
    "#5F574F",
    "#C2C3C7",
    "#FFF1E8",
    "#FF004D",
    "#FFA300",
    "#FFEC27",
    "#00E436",
    "#29ADFF",
    "#83769C",
    "#FF77A8",
    "#FFCCAA"
];

const eraserColor = "#FFF";

var currentTool = "brush";
var brushSize = 10;
var brushColor = 0;

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
        currentTool === "eraser" ? eraserColor : colors[brushColor];

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

    startTimer(90);
}

function saveAndClearPainting() {
    paintings.push(canvas.toDataURL("image/png"));
    ctx.clearRect(0,0,400,400);
}

function nextPrompt() {
    playsound("click");
    saveAndClearPainting();
    document.getElementById("paintingPrompt").textContent = "Prompt: " + prompts[1];
    if(paintings.length == 2 /* total paintings */ - 1) {
        document.getElementById("nextPrompt").classList.add("disabled");
    }
}

function setBrush(id) {
    playsound("click");

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

    timerTimeout = null;
    topBid = 0;
    lastBidder = -1;
    lastBidderName = "";
}

function updateBidStatus() {
    document.getElementById("top").children[0].textContent = `Artwork ${currentPainting + 1}/${serverPaintings.length}`;

    document.getElementById("topBid").textContent = `Top Bid: $${topBid.toLocaleString("en-us")}`;
    document.getElementById("topBidder").textContent = `Top Bidder: ${lastBidderName ? lastBidderName : "N/A"}`;

    document.getElementById("raise1").textContent = `$${(topBid + 100).toLocaleString("en-us")}`;
    document.getElementById("raise2").textContent = `$${(topBid + 200).toLocaleString("en-us")}`;
    document.getElementById("raise3").textContent = `$${(topBid + 300).toLocaleString("en-us")}`;

    const h = document.getElementById("hints");
    h.textContent = "";
    for (const hint of hints) {
        h.innerHTML +=
            hint.prompt +
            " is worth $" +
            (hint.value || 0).toLocaleString("en-US") +
            "<br>";
    }

    document.getElementById("money").textContent = `$${money.toLocaleString("en-us")}`;

    const bidButtons = document.getElementById("mid").children;
    for(const child of bidButtons) {
        child.disabled = lastBidder == myPlayerId;
    }
}

function updateBidTimer(t = 10) {
    clearInterval(timerInterval);

    timerEnd = Date.now() + t * 1000;

    updateBidTimerDisplay();

    timerInterval = setInterval(() => {
        updateBidTimerDisplay();

        if (Date.now() >= timerEnd) {
            clearInterval(timerInterval);
            timerInterval = null;
            secondsLeft = 0;
            updateBidTimerDisplay();
        }
    }, 100);
}

function updateBidTimerDisplay() {
    secondsLeft = Math.max(
        0,
        Math.ceil((timerEnd - Date.now()) / 1000)
    );

    const head =
        `Artwork ${currentPainting + 1}/${serverPaintings.length}`;

    if (secondsLeft <= 5 && secondsLeft != 0) {
        updateTimerDisplay(head);
    } else {
        document.getElementById("top").children[0].textContent = head;
    }
}

function raise1() {
    playsound("click");
    submitBid(topBid + 100);
}

function raise2() {
    playsound("click");
    submitBid(topBid + 200);
}

function raise3() {
    playsound("click");
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
        console.error("Could not send message: WebSocket is not connected.");
    }
}

socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log("Received:", message);

    if (message.type === "serverFull") {
        alert("This server is full!");
        return;
    }

    if (message.type === "players") {
        myPlayerId = message.yourId;

        message.players.forEach(player => {
            addPointer(player.id, player.name, player.head ?? 0);
            addPlayerToLobby(player);
        });

        return;
    }

    if (message.type === "playerJoined") {
        addPointer(message.player.id, message.player.name, message.player.head ?? 0);
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

        message.players.forEach(player => {
            addPointer(player.id, player.name, player.head ?? 0);
            addPlayerToLobby(player);
        });

        enterGame(message.code);

        return;
    }

    if (message.type === "headChanged") {
        setPointerHead(message.playerId, message.head);
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
        updateBidStatus();

        document.getElementById("imageBox").classList.remove("dropped");
    }

    if (message.type === "bidProcessed") {
        topBid = message.bid;
        lastBidder = message.player.id;
        lastBidderName = message.player.name;

        updateBidStatus();
        updateBidTimer(10);

        return;
    }

    if (message.type === "updateMoney") {
        money = message.money;
    }

    if (message.type === "artworkSold") {
        topBid = message.bid;
        lastBidder = message.playerId;

        document.getElementById("imageBox").classList.add("dropped");

        updateBidStatus();

        return;
    }

};

// Connection closed
socket.onclose = () => {
    console.warn("Disconnected from server");
};