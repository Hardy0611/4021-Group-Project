import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const onlineUsers = {};

// Middleware for parsing JSON
app.use(express.json());

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

  const users = JSON.parse(fs.readFileSync("../data/users.json", "utf-8"));

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

  fs.writeFileSync("data/users.json", JSON.stringify(users, null, "  "));

  res.status(201).json({ message: "User registered successfully" });
});

// Handle user login
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const users = JSON.parse(fs.readFileSync("../data/users.json", "utf-8"));
  // Check password
  const isPasswordValid = await bcrypt.compare(
    password,
    users[username].password
  );
  if (!isPasswordValid) {
    res.json({ status: "error", error: "Invalid username or password." });
    return;
  }

  // Store user in session
  req.session.user = users[username];
  res.json({ status: "ok" });
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
      position: { x: 0, y: 0 },
      direction: "idle",
      weapon: "none",
      health: 100,
    };
    console.log(onlineUsers);

    // Broadcast to all clients that a new user has connected
    io.emit("add user", JSON.stringify(user));
  }

  // Handle user disconnection
  socket.on("disconnect", () => {
    if (user) {
      delete onlineUsers[user.username];
      console.log(onlineUsers);
      // Broadcast to all clients that a user has disconnected
      io.emit("remove user", JSON.stringify(user));
    }
  });

  // Handle update user movement
  socket.on("updateUser", (data) => {
    const { username, position, direction, weapon, health } = JSON.parse(data);
    if (onlineUsers[username]) {
      onlineUsers[username].position = position;
      onlineUsers[username].direction = direction;
      onlineUsers[username].weapon = weapon;
      onlineUsers[username].health = health;
      io.emit("updateUser", JSON.stringify(onlineUsers)); // Update all users
    }
  });
});

// serving the backend server
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});