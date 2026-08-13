const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

let players = [];

wss.on("connection", (socket) => {

    // Create a new player
    const playerID = crypto.randomUUID();

    const player = {
        id: playerID,
        name: "Player" + playerID.slice(0, 5),
        data: {
            money: 3000
        }
    };

    // Associate this socket with the player
    socket.playerId = playerID;

    // Add player to the list
    players.push(player);

    console.log("Player connected.");
    console.log("Players:", players);


    // Tell the new player their ID and the current players
    socket.send(JSON.stringify({
        type: "players",
        yourId: playerID,
        players: players
    }));


    // Tell everyone else that a new player joined
    wss.clients.forEach((client) => {
        if (
            client !== socket &&
            client.readyState === WebSocket.OPEN
        ) {
            client.send(JSON.stringify({
                type: "playerJoined",
                player: player
            }));
        }
    });


    socket.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            console.log("Received:", data);

            // Find the player who sent the message
            const player = players.find(
                (p) => p.id === socket.playerId
            );

            if (!player) {
                console.log("Player not found.");
                return;
            }


            /*
             * Handle different types of messages
             */

            if (data.type === "updateData") {

                // Example:
                // data.data = { money: 2500 }

                player.data = {
                    ...player.data,
                    ...data.data
                };

                console.log("Updated player:", player);


                // Tell everyone about the updated player
                broadcast({
                    type: "playerUpdated",
                    player: player
                });
            }


            else {
                // For other messages, just broadcast them
                broadcast({
                    ...data,
                    playerId: socket.playerId
                });
            }

        } catch (error) {
            console.log("Invalid message:", error);
        }
    });


    socket.on("close", () => {

        // Find the player's index
        const index = players.findIndex(
            (p) => p.id === socket.playerId
        );

        if (index !== -1) {

            // Remove that player
            const removedPlayer = players.splice(index, 1)[0];

            console.log("Player disconnected:", removedPlayer);
            console.log("Players:", players);


            // Tell everyone that player left
            broadcast({
                type: "playerLeft",
                playerId: removedPlayer.id
            });
        }
    });
});


/*
 * Send a message to every connected player
 */
function broadcast(data) {

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });

}


const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});