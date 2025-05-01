import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Middleware for parsing JSON
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: "PUBGarena", // Replace with a secure key
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { maxAge: 300000 }, // Session expires in 5 minutes
  })
);

// In-memory user database
const users = [];

// Login route
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = { username }; // Save user info in session
    res.json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// Logout route
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

// WebSocket connection
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle custom WebSocket events
  socket.on("message", (data) => {
    console.log("Message received:", data);
    socket.broadcast.emit("message", data); // Broadcast to other clients
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

// Serve the Vite frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

// Start the server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});