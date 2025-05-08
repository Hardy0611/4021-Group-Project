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

// Dynamic CORS configuration that accepts any origin but still works with credentials
const corsConfig = {
  // This function dynamically sets the allowed origin to match the requesting origin
  origin: function(origin, callback) {
    callback(null, origin); // Allow any origin that makes a request
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
};

const app = express();
const httpServer = createServer(app);

const onlineUsers = {};

// Initialize instances
const environmentInstance = Environment();
var bulletIDCounter = 0;

// Middleware for parsing JSON
app.use(express.json());

// Apply CORS to Express
app.use(cors(corsConfig));

// Apply same CORS config to Socket.IO
const io = new Server(httpServer, {
  cors: corsConfig
});

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
      username: user.username,
      position: { x: 0, y: 1.5, z: 20 },
      sequence: null,
      direction: "idle",
      hasGun: false,
      health: 3,
      facing: "down",
      hitAnimation: false,
      ready: false,
    };
    console.log(onlineUsers);
  }

  // Handle explicit user logout
  socket.on("userLogout", (username) => {
    if (username && onlineUsers[username]) {
      delete onlineUsers[username];
      console.log(`User ${username} logged out`);
      // Broadcast user list update to all clients
      io.emit("updateUser", JSON.stringify(onlineUsers));
    }
  });

  //Handle waiting room
  socket.on("playerReady", (username) => {
    // change the user ready state in onlineUsers
    onlineUsers[username].ready = true;
    console.log(`Player ${username} is ready`);

    // check if all users are ready
    const allUsers = Object.values(onlineUsers);
    const readyCount = allUsers.filter(user => user.ready).length;
    const totalCount = allUsers.length;

    if (totalCount > 0 && readyCount === totalCount){
      console.log("All players are ready")
      io.emit("allReady");
    }
  });

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
  socket.on("uploadUser", (data) => {
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
    const bulletID = bulletIDCounter++;

    // Add shooter's ID to the bullet info
    const bulletData = {
      id: bulletID,
      shooterID: socket.id, // Add this line
      direction: bulletInfo.direction,
      initialX: bulletInfo.initialX,
      initialZ: bulletInfo.initialZ,
    };

    // Broadcast bullet to all clients
    io.emit("addBullet", JSON.stringify(bulletData));
  });

  socket.on("playerHit", (data) => {
    const hitInfo = JSON.parse(data);
    const hitUsername = hitInfo.hitPlayer;

    console.log(`${hitUsername} got hit`);

    // Update user state to indicate hit animation should play
    if (onlineUsers[hitUsername]) {
      // Add a hit animation flag to the player state
      onlineUsers[hitUsername].hitAnimation = true;

      // Decrease player health
      onlineUsers[hitUsername].health -= 1;

      // Broadcast the updated player state to all clients
      io.emit("updateUser", JSON.stringify(onlineUsers));

      // Remove the hit animation flag after 1 second
      setTimeout(() => {
        if (onlineUsers[hitUsername]) {
          onlineUsers[hitUsername].hitAnimation = false;
          io.emit("updateUser", JSON.stringify(onlineUsers));
        }
      }, 400);
    }
  });
});

// serving the backend server
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
