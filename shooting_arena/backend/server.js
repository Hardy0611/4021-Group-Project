import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import Environment from "./environment.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const usersFile = path.join(__dirname, "data/users.json");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow all origins
    methods: ["GET", "POST"],
    credentials: true, // Allow cookies/session
  },
});

const onlineUsers = {};

// Initialize instances
const environmentInstance = Environment();
var bulletIDCounter = 0;

// Middleware for parsing JSON
app.use(express.json());

app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true, // Allow cookies/session
  })
);

// This helper function checks whether the text only contains word characters
function containWordCharsOnly(text) {
  return /^\w+$/.test(text);
}

// Session middleware
const gameSession = session({
  secret: "PUBGarena", // Replace with a secure key
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { maxAge: 300000 }, // Session expires in 5 minutes
});
app.use(gameSession);

io.use((socket, next) => {
  gameSession(socket.request, {}, next);
});

// Handle the registration of new users
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));

  // Check valid input
  if (!username || !password) {
    res.json({ status: "error", error: "All fields are required." });
    return;
  }
  if (!containWordCharsOnly(username)) {
    res.json({
      status: "error",
      error: "Username can only contain underscore, letters or numbers.",
    });
    return;
  }
  if (users[username]) {
    res.json({ status: "error", error: "Username already exists." });
    return;
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create a new user
  users[username] = {
    username: username,
    password: hashedPassword,
  };

  fs.writeFileSync(usersFile, JSON.stringify(users, null, "  "));

  res.json({ status: "ok", message: "User registered successfully" });
});

// Handle user login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  const user = users[username];
  if (!user) {
    res.json({ status: "error", error: "Invalid username or password." });
    return;
  }
  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    res.json({ status: "error", error: "Invalid username or password." });
    return;
  }

  // Store user in session
  req.session.user = { username: user.username }; // Don't send password hash
  res.json({ status: "ok", user: { username: user.username } });
});

// Handle validation of session
app.get("/validate", (req, res) => {
  const user = req.session.user;
  if (user) {
    res.json({ status: "ok", user: user });
  } else {
    res.json({ status: "error", error: "Session expired." });
  }
});

// Handle user logout
app.get("/logout", (req, res) => {
  if (req.session.user) {
    delete req.session.user;
    res.json({ status: "ok" });
  }
});

// Handle websocket connections
io.on("connection", (socket) => {
  const user = socket.request.session.user;
  if (user) {
    // init user states and store in onlineUsers
    onlineUsers[user.username] = {
      name: user.username,
      position: { x: 0, y: 1.5, z: 20 },
      sequence: null,
      direction: "idle",
      facing: "down",
      hasGun: false,
      health: 100,
    };
    console.log(onlineUsers);

    // Broadcast to all clients that a new user has connected
    io.emit("updateUser", JSON.stringify(onlineUsers));
  }

  // Handle user disconnection
  socket.on("disconnect", () => {
    if (user) {
      delete onlineUsers[user.username];
      console.log(onlineUsers);
      // Broadcast to all clients that a user has disconnected
      io.emit("updateUser", JSON.stringify(onlineUsers));
    }
  });

  // Handle update user movement
  socket.on("updateUser", (data) => {
    const userState = JSON.parse(data);
    onlineUsers[userState.username] = userState;
    io.emit("updateUser", JSON.stringify(onlineUsers));
  });

  // Handle guns
  socket.on("getGun", () => {
    let gunsArray = environmentInstance.getGunPosition();
    gunsArray = gunsArray.length
      ? gunsArray
      : environmentInstance.initializeGunPosition();
    io.emit("updateGun", JSON.stringify(gunsArray));
  });

  socket.on("playerCollectGun", (data) => {
    const info = JSON.parse(data);
    const gun = environmentInstance.getGunByID(info.id);
    const gunsArray = environmentInstance.removeGun(info.id);
    io.emit("updateGun", JSON.stringify(gunsArray));
    io.emit(
      "updatePlayerGun",
      JSON.stringify({ gun, username: info.username })
    );
  });

  socket.on("addBullet", (data) => {
    const bulletInfo = JSON.parse(data);
    bulletInfo["id"] = bulletIDCounter;
    bulletIDCounter += 1;
    io.emit("addBullet", JSON.stringify(bulletInfo));
  });
});

// serving the backend server
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
