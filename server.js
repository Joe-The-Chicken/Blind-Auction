const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const MAX_PLAYERS = 5;
const CODE_LENGTH = 6;

// All active lobbies
const lobbies = new Map();


// Generate a random lobby code
function generateLobbyCode() {
    const characters = "BCDFGHJKLMNPQRSTVWXYZ";

    let char = characters[
        Math.floor(Math.random() * characters.length)
    ];

    let code = "";

    for (let i = 0; i < CODE_LENGTH; i++) {
        if(Math.random() < 2 * (code.length - (code.split(char).length - 1)) / CODE_LENGTH && (code.split(char).length - 1) < 3) {
            code += char;
        } else {
            code += characters[
                Math.floor(Math.random() * characters.length)
            ];
        }
    }

    return code;
}


// Generate a code that isn't already being used
function createLobbyCode() {

    let code;

    do {
        code = generateLobbyCode();
    } while (lobbies.has(code));

    return code;
}


// Find the first available player ID
function getAvailablePlayerId(lobby) {

    for (let i = 0; i < MAX_PLAYERS; i++) {

        if (!lobby.players.some(player => player.id === i)) {
            return i;
        }

    }

    return null;
}


// Send a message to everyone in a lobby
function broadcast(lobby, data) {

    lobby.sockets.forEach(socket => {

        if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));
        }

    });

}


wss.on("connection", (socket) => {

    console.log("New connection");

    /*
     * At this point the player isn't in a lobby yet.
     */

    socket.lobbyCode = null;
    socket.playerId = null;


    socket.on("message", (message) => {

        try {

            const data = JSON.parse(message);

            console.log("Received:", data);


            /*
             * CREATE LOBBY
             */

            if (data.type === "createLobby") {

                // Don't allow someone to create multiple lobbies
                if (socket.lobbyCode !== null) {
                    return;
                }

                const code = createLobbyCode();

                const lobby = {
                    code: code,
                    players: [],
                    sockets: new Set(),

                    timer: null,
                    prompts: [],
                    artworks: []
                };

                lobbies.set(code, lobby);

                joinLobby(socket, lobby);

                // Tell creator their lobby code
                socket.send(JSON.stringify({
                    type: "lobbyCreated",
                    code: code,
                    playerId: socket.playerId,
                    players: lobby.players
                }));

                return;
            }


            /*
             * JOIN LOBBY
             */

            if (data.type === "joinLobby") {

                if (socket.lobbyCode !== null) {
                    return;
                }

                const code = String(data.code).toUpperCase();

                const lobby = lobbies.get(code);


                // Lobby doesn't exist
                if (!lobby) {

                    socket.send(JSON.stringify({
                        type: "joinFailed",
                        reason: "Lobby does not exist."
                    }));

                    return;
                }


                // Lobby is full
                if (lobby.players.length >= MAX_PLAYERS) {

                    socket.send(JSON.stringify({
                        type: "joinFailed",
                        reason: "Lobby is full."
                    }));

                    return;
                }


                joinLobby(socket, lobby);

                return;
            }


            /*
             * PLAYER GAME MESSAGES
             */

            if (socket.lobbyCode !== null) {

                const lobby = lobbies.get(socket.lobbyCode);

                if (!lobby) {
                    return;
                }

                const player = lobby.players.find(
                    p => p.id === socket.playerId
                );

                if (!player) {
                    return;
                }


                // Example player data update
                if (data.type === "updateData") {

                    player.data = {
                        ...player.data,
                        ...data.data
                    };

                    broadcast(lobby, {
                        type: "playerUpdated",
                        player: player
                    });

                    return;
                }

                if(data.type === "leaveLobby") {
                    leaveLobby(socket);
                }

                if (data.type === "startGame") {
                    // Prevent multiple starts
                    if (lobby.timer !== null) {
                        return;
                    }

                    // Reset prompts for the new round
                    lobby.prompts = [];

                    // Tell everyone the game has started
                    broadcast(lobby, {
                        type: "gameStarted"
                    });

                    // Start countdown
                    lobby.timer = setTimeout(() => {

                        broadcast(lobby, {
                            type: "grabPrompts"
                        });

                        lobby.timer = null;

                    }, 20000);

                    return;
                }

                if(data.type === "prompts") {
                    function shufflePrompts(lobby) {
                        const playerIds = lobby.players.map(player => player.id);

                        if (playerIds.length < 2) {
                            return;
                        }

                        let shuffledIds;

                        // Keep shuffling until nobody gets their own prompts
                        do {
                            shuffledIds = [...playerIds];

                            for (let i = shuffledIds.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));

                                [shuffledIds[i], shuffledIds[j]] =
                                    [shuffledIds[j], shuffledIds[i]];
                            }

                        } while (
                            shuffledIds.some(
                                (id, index) => id === playerIds[index]
                            )
                        );

                        // Give each player someone else's prompts
                        playerIds.forEach((playerId, index) => {

                            const assignedFromPlayer = shuffledIds[index];

                            const player = lobby.players.find(
                                player => player.id === playerId
                            );

                            player.data.prompts =
                                lobby.prompts[assignedFromPlayer];
                        });
                    }

                    lobby.prompts[socket.playerId] = data.prompts;
                    if (Object.keys(lobby.prompts).length === lobby.players.length) {
                        shufflePrompts(lobby);
                        
                        lobby.sockets.forEach(socket => {
                            if (socket.readyState === WebSocket.OPEN) {
                                const player = lobby.players.find(
                                    player => player.id === socket.playerId
                                );

                                socket.send(JSON.stringify({
                                    type: "startPainting",
                                    prompts: player.data.prompts
                                }));
                            }
                        });
                    }
                    return;
                }

                // Any other message
                broadcast(lobby, {
                    ...data,
                    playerId: socket.playerId
                });
            }

        } catch (error) {

            console.log("Invalid message:", error);

        }

    });


    socket.on("close", () => {

        leaveLobby(socket);

    });

});



/*
 * Put a player into a lobby
 */

function joinLobby(socket, lobby) {

    const playerId = getAvailablePlayerId(lobby);

    if (playerId === null) {
        return;
    }


    const player = {
        id: playerId,

        name: "Player" + playerId,

        data: {
            money: 3000,
            debt: 0,
            artworks: []
        }
    };


    // Associate socket with player
    socket.lobbyCode = lobby.code;
    socket.playerId = playerId;


    // Add player to lobby
    lobby.players.push(player);
    lobby.sockets.add(socket);


    console.log(
        `Player ${playerId} joined lobby ${lobby.code}`
    );


    /*
     * Tell the player they successfully joined
     */

    socket.send(JSON.stringify({
        type: "lobbyJoined",

        code: lobby.code,

        yourId: playerId,

        players: lobby.players
    }));


    /*
     * Tell everyone else
     */

    lobby.sockets.forEach(client => {

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

}



/*
 * Remove a player from their lobby
 */

function leaveLobby(socket) {

    if (socket.lobbyCode === null) {
        return;
    }

    const lobby = lobbies.get(socket.lobbyCode);

    if (!lobby) {
        socket.lobbyCode = null;
        socket.playerId = null;
        return;
    }

    const playerIndex = lobby.players.findIndex(
        player => player.id === socket.playerId
    );

    if (playerIndex !== -1) {

        const player = lobby.players[playerIndex];

        lobby.players.splice(playerIndex, 1);
        lobby.sockets.delete(socket);

        broadcast(lobby, {
            type: "playerLeft",
            playerId: player.id
        });
    }

    if (lobby.players.length === 0) {
        lobbies.delete(lobby.code);
    }

    // Player is no longer in a lobby
    socket.lobbyCode = null;
    socket.playerId = null;

    // Tell the player they successfully left
    socket.send(JSON.stringify({
        type: "lobbyLeft"
    }));
}



const PORT = process.env.PORT || 10000;

server.listen(PORT, "0.0.0.0", () => {

    console.log(
        `Server running on port ${PORT}`
    );

});