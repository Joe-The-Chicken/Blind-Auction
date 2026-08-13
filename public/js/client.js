const socket = new WebSocket(
    location.protocol === "https:"
        ? "wss://" + location.host
        : "ws://" + location.host
);

socket.onopen = () => {
    console.log("successfully connected to server");
};

socket.onclose = () => {
    console.log("disconnected from server");
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    console.log("Received from server:", data);

    if (data.type === "playerCount") {
        console.log(`${data.count} players online`);
    }

    if (data.type === "message") {
        console.log("Game message:", data.message);
    }
};

function sendMessage() {
    socket.send(JSON.stringify({
        type: "message",
        message: "Hello from the game!"
    }));
}