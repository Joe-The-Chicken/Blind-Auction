const socket = new WebSocket(
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
);

const paddleContainer = document.getElementById("paddleContainer");

let myPlayerId = null;

/*
█░░ █▀█ █▀▀ ▄▀█ █░░   █▀▀ █░█ █▄░█ █▀▀ ▀█▀ █ █▀█ █▄░█ █▀
█▄▄ █▄█ █▄▄ █▀█ █▄▄   █▀░ █▄█ █░▀█ █▄▄ ░█░ █ █▄█ █░▀█ ▄█
*/

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
        });

        return;
    }

    if (message.type === "playerJoined") {
        addPointer(message.player.id);
        return;
    }

    if (message.type === "playerLeft") {
        removePointer(message.playerId);
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

};


// Connection closed
socket.onclose = () => {
    console.log("Disconnected from server");
};