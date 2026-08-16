const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

const MAX_PLAYERS = 8;
const CODE_LENGTH = 4;

// All active lobbies
const lobbies = new Map();

// Generate a random lobby code
function generateLobbyCode() {
    const chars = "BCDFGHJKLMNPQRSTVWXYZ";
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
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

    socket.lobbyCode = null;
    socket.playerId = null;

    socket.on("message", (message) => {
        try {
            const data = JSON.parse(message);

            console.log("Received:", data);

            if (data.type === "createLobby") {
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
                    paintings: [],

                    topBid: 0,
                    topBidder: -1,
                    auctionActive: false,
                    currentPainting: 0
                };

                lobbies.set(code, lobby);

                joinLobby(socket, lobby);

                socket.send(JSON.stringify({
                    type: "lobbyCreated",
                    code: code,
                    playerId: socket.playerId,
                    players: lobby.players
                }));

                return;
            }

            if (data.type === "joinLobby") {
                if (socket.lobbyCode !== null) {
                    return;
                }

                const code = String(data.code).toUpperCase();
                const lobby = lobbies.get(code);

                if (!lobby) {

                    socket.send(JSON.stringify({
                        type: "joinFailed",
                        reason: "Lobby does not exist."
                    }));

                    return;
                }

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

                        lobby.timer = setTimeout(() => {
                            broadcast(lobby, {
                                type: "grabPaintings"
                            });

                            lobby.timer = null;
                        }, 90000);
                    }
                    return;
                }

                if(data.type === "paintings") {
                    data.paintings.forEach(painting => lobby.paintings.push(painting));

                    if (lobby.paintings.length / 2 == lobby.players.length) {
                        lobby.auctionActive = true;
                        lobby.topBid = 0;
                        lobby.topBidder = -1;
                        lobby.currentPainting = 0;

                        function rand(a,b) {
                            return Math.floor(Math.random() * (b-a)) + a
                        }
                        
                        lobby.paintings.forEach(painting => {
                            painting.value = rand(4,50) * 100
                        })

                        function shuffle(array) {
                            for (let i = array.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [array[i], array[j]] = [array[j], array[i]];
                            }
                            return array;
                        }

                        const shufflePaintings = shuffle(lobby.paintings)
                        lobby.sockets.forEach(socket => {
                            if (socket.readyState === WebSocket.OPEN) {
                                const player = lobby.players.find(
                                    player => player.id === socket.playerId
                                );

                                const hints = [];

                                socket.send(JSON.stringify({
                                    type: "initBidding",
                                    hints: hints,
                                    paintings: shufflePaintings,
                                    startingMoney: 2500
                                }));
                            }
                        });
                    }
                    return;
                }

                if (data.type === "sendBid") {
                    function startNextAuction(lobby) {
                        lobby.currentPainting++;

                        if (lobby.currentPainting >= lobby.paintings.length) {
                            broadcast(lobby, {
                                type: "gameFinished"
                            });
                            return;
                        }

                        lobby.topBid = 0;
                        lobby.topBidder = -1;
                        lobby.auctionActive = true;
                        lobby.timer = null;

                        broadcast(lobby, {
                            type: "loadArtwork",
                            num: lobby.currentPainting
                        });
                    }

                    function sellArtwork(lobby) {
                        if (!lobby.auctionActive) {
                            return;
                        }

                        lobby.auctionActive = false;

                        if (lobby.timer !== null) {
                            clearTimeout(lobby.timer);
                            lobby.timer = null;
                        }

                        const winner = lobby.players.find(
                            player => player.id === lobby.topBidder
                        );

                        if (!winner) {
                            broadcast(lobby, {
                                type: "artworkUnsold"
                            });

                            return;
                        }

                        winner.data.money -= lobby.topBid;
                        winner.data.paintings.push(lobby.paintings[lobby.currentPainting]);

                        const winnerSocket = [...lobby.sockets].find(
                            socket => socket.playerId === winner.id
                        );

                        if (winnerSocket && winnerSocket.readyState === WebSocket.OPEN) {
                            winnerSocket.send(JSON.stringify({
                                type: "updateMoney",
                                money: winner.data.money
                            }));
                        }

                        const artist = lobby.paintings[lobby.currentPainting].artist;
                        var artistPlayer = lobby.players.find(
                            player => player.id === artist
                        );

                        artistPlayer.data.money += lobby.topBid;

                        const artistSocket = [...lobby.sockets].find(
                            socket => socket.playerId === artist
                        );

                        if (artistSocket && artistSocket.readyState === WebSocket.OPEN) {
                            artistSocket.send(JSON.stringify({
                                type: "updateMoney",
                                money: artistPlayer.data.money
                            }));
                        }

                        broadcast(lobby, {
                            type: "artworkSold",
                            playerId: winner.id,
                            bid: lobby.topBid
                        });

                        broadcast(lobby, {
                            type: "lobbyPointer",
                            pointerUp: false,
                            playerId: lobby.topBidder
                        });

                        setTimeout(() => {
                            startNextAuction(lobby);
                        }, 5000);
                    }


                    function resetAuctionTimer(lobby) {

                        if (lobby.timer !== null) {
                            clearTimeout(lobby.timer);
                        }

                        lobby.timer = setTimeout(() => {
                            sellArtwork(lobby);
                        }, 10000);
                    }


                    if (!lobby.auctionActive) {
                        return;
                    }

                    if (data.bid <= lobby.topBid) {
                        return;
                    }

                    if (socket.playerId === lobby.topBidder) {
                        return;
                    }

                    if (data.bid > player.data.money) {
                        return;
                    }

                    broadcast(lobby, {
                        type: "lobbyPointer",
                        pointerUp: false,
                        playerId: lobby.topBidder
                    });

                    lobby.topBid = data.bid;
                    lobby.topBidder = socket.playerId;

                    broadcast(lobby, {
                        type: "bidProcessed",
                        bid: lobby.topBid,
                        player: player
                    });

                    broadcast(lobby, {
                        type: "lobbyPointer",
                        pointerUp: true,
                        playerId: lobby.topBidder
                    });

                    resetAuctionTimer(lobby);

                    return;
                }

                // Any other message
                broadcast(lobby, {
                    ...data,
                    playerId: socket.playerId
                });
            }

        } catch (error) {

            console.error("Invalid message:", error);

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
            money: 2500,
            debt: 0,
            paintings: []
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
        if (lobby.timer !== null) {
            clearTimeout(lobby.timer);
            lobby.timer = null;
        }

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

    console.info(
        `Server running on port ${PORT}`
    );

});