
// Import and Setup

const path = require("path");
const http = require("http");
const express = require("express");
const socketio = require("socket.io");
const formatMessage = require("./utils/messages");
const createAdapter = require("@socket.io/redis-adapter").createAdapter;
const redis = require("redis");
require("dotenv").config();
const { createClient } = redis;
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
} = require("./utils/users");


// Expres App and Socket.io Server Setup'
// Create an Express app (app) and an HTTP server (server) using http.createServer.
// Initialize Socket.io on the server (io).
// Set up a static folder to serve static files (e.g., HTML, CSS) using express.static

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));

const botName = "Chat Chat Bot";


// //Redis Connection and Adapter Setup
// Asynchronously connect to Redis using two clients (pubClient and subClient).
// Establish a connection to the Redis server using the connect method.
// Create a Socket.io adapter using the Redis adapter to enable broadcasting events across multiple Node.js processes.
(async () => {
  try {
    pubClient = createClient({ url: "redis://127.0.0.1:6379" });
    await pubClient.connect();
    subClient = createClient({ url: "redis://127.0.0.1:6379" });
    io.adapter(createAdapter(pubClient, subClient));
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
})();

// Socket.io Event Handling
// Listen for the "connection" event, which triggers when a client connects to the Socket.io server.
// Log information about the adapter to the console for debugging purposes.
// Implement event handlers for "joinRoom," "chatMessage," and "disconnect" events.
io.on("connection", (socket) => {
  console.log(io.of("/").adapter);
  socket.on("joinRoom", ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit("message", formatMessage(botName, "Welcome to Chat Chat!"));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit("roomUsers", {
      room: user.room,
      users: getRoomUsers(user.room),
    });
  });

  // Listen for chatMessage
  socket.on("chatMessage", (msg) => {
    const user = getCurrentUser(socket.id);

    io.to(user.room).emit("message", formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on("disconnect", () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        "message",
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit("roomUsers", {
        room: user.room,
        users: getRoomUsers(user.room),
      });
    }
  });
});

// Server Start 
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
