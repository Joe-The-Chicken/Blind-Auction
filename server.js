const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

let players = 0;

wss.on("connection", (socket) => {
    players++;

    console.log("Player connected. Players:", players);

    // Tell the new player how many people are online
    socket.send(JSON.stringify({
        type: "playerCount",
        count: players
    }));

    socket.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            console.log("Received:", data);

            // Send the information to EVERY connected player
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });

        } catch (error) {
            console.log("Invalid message:", error);
        }
    });

    socket.on("close", () => {
        players--;

        console.log("Player disconnected. Players:", players);

        // Update everyone
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "playerCount",
                    count: players
                }));
            }
        });
    });
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});