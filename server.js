const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const MAX_PLAYERS = 5;
let players = [];

// Get the first available player ID from 0-4
function getAvailablePlayerId() {
    for (let i = 0; i < MAX_PLAYERS; i++) {
        if (!players.some(player => player.id === i)) {
            return i;
        }
    }

    return null;
}

// Send a message to everyone
function broadcast(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection", (socket) => {

    // Don't allow more than 5 players
    const playerID = getAvailablePlayerId();

    if (playerID === null) {
        socket.send(JSON.stringify({
            type: "serverFull"
        }));

        socket.close();
        return;
    }

    // Create player
    const player = {
        id: playerID,
        name: "Player" + playerID,
        data: {
            money: 3000
        }
    };

    socket.playerId = playerID;

    players.push(player);

    console.log(
        `Player ${playerID} connected. Players:`,
        players.map(p => p.id)
    );

    // Tell the new player about themselves and everyone else
    socket.send(JSON.stringify({
        type: "players",
        yourId: playerID,
        players: players
    }));

    // Tell everyone else that a player joined
    broadcast({
        type: "playerJoined",
        player: player
    });


    socket.on("message", (message) => {

        try {
            const data = JSON.parse(message);

            console.log("Received:", data);

            const player = players.find(
                p => p.id === socket.playerId
            );

            if (!player) {
                return;
            }

            // Update player data
            if (data.type === "updateData") {

                player.data = {
                    ...player.data,
                    ...data.data
                };

                broadcast({
                    type: "playerUpdated",
                    player: player
                });

                return;
            }

            // Other messages
            broadcast({
                ...data,
                playerId: socket.playerId
            });

        } catch (error) {
            console.log("Invalid message:", error);
        }
    });


    socket.on("close", () => {

        const index = players.findIndex(
            p => p.id === socket.playerId
        );

        if (index === -1) {
            return;
        }

        const removedPlayer = players.splice(index, 1)[0];

        console.log(
            `Player ${removedPlayer.id} disconnected. Players:`,
            players.map(p => p.id)
        );

        // Tell everyone that this player left
        broadcast({
            type: "playerLeft",
            playerId: removedPlayer.id
        });
    });

});


const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});