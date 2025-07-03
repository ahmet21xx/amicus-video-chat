const http = require("http");
const express = require("express");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("Yeni bağlantı:", socket.id);

  if (waitingUser) {
    const other = waitingUser;
    waitingUser = null;
    socket.partner = other.id;
    other.partner = socket.id;

    other.emit("matched");
    socket.emit("matched");
  } else {
    waitingUser = socket;
  }

  socket.on("offer", (data) => {
    if (socket.partner) io.to(socket.partner).emit("offer", data);
  });

  socket.on("answer", (data) => {
    if (socket.partner) io.to(socket.partner).emit("answer", data);
  });

  socket.on("ice-candidate", (data) => {
    if (socket.partner) io.to(socket.partner).emit("ice-candidate", data);
  });

  socket.on("message", (msg) => {
    if (socket.partner) io.to(socket.partner).emit("message", msg);
  });

  socket.on("disconnect", () => {
    if (waitingUser === socket) waitingUser = null;
    if (socket.partner) io.to(socket.partner).emit("partner-disconnected");
  });
});

server.listen(3001, () => {
  console.log("Socket sunucusu 3001 portunda çalışıyor");
});
