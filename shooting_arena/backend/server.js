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
  origin: function (origin, callback) {
    callback(null, origin); // Allow any origin that makes a request
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

const app = express();
const httpServer = createServer(app);

const onlineUsers = {};
const usersInWaitingRoom = new Set(); // Track who's in waiting room

// Initialize instances
const environmentInstance = Environment();
var bulletIDCounter = 0;

// Middleware for parsing JSON
app.use(express.json());

// Apply CORS to Express
app.use(cors(corsConfig));

// Apply same CORS config to Socket.IO
const io = new Server(httpServer, {
  cors: corsConfig,
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
      freeze: false,
      inGame: false,
      isdead: null,
    };
    console.log(onlineUsers);
  }

  // Handle explicit user logout
  socket.on("userLogout", (username) => {
    if (username && onlineUsers[username]) {
      leaveWaitingRoom(username);
      delete onlineUsers[username];
      console.log(`User ${username} logged out`);
      // Broadcast user list update to all clients
      io.emit("updateUser", JSON.stringify(onlineUsers));

      checkAllUsersReady();
    }
  });

  //Handle waiting room
  socket.on("playerReady", (username) => {
    if (usersInWaitingRoom.size === Object.keys(onlineUsers).length) {
      onlineUsers[username].ready = true;
      console.log(`Player ${username} is ready`);

      // Check if all users are ready
      checkAllUsersReady();
    }
  });

  function checkAllUsersReady() {
    const allUsers = Object.values(onlineUsers);
    const readyCount = allUsers.filter((user) => user.ready).length;
    const totalCount = allUsers.length;
    const inGame = allUsers.filter((user) => user.inGame).length;

    // Send waiting status to all clients
    io.emit(
      "waitingStatus",
      JSON.stringify({
        ready: readyCount,
        total: totalCount,
        inGame: inGame,
      })
    );

    if (totalCount > 0 && readyCount === totalCount && inGame === 0) {
      console.log("All players are ready");
      usersInWaitingRoom.clear();
      io.emit("allReady");
    }
  }

  // Handle user disconnection
  socket.on("disconnect", () => {
    if (user) {
      // Remove from waiting room tracking
      leaveWaitingRoom(user.username);

      // Your existing disconnect code
      delete onlineUsers[user.username];
      io.emit("updateUser", JSON.stringify(onlineUsers));
      checkAllUsersReady();
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

  socket.on("freezeOtherUser", (data) => {
    const notFreezeUsername = JSON.parse(data);
    // Update freeze state for all users at once
    Object.keys(onlineUsers).forEach((username) => {
      onlineUsers[username].freeze = username !== notFreezeUsername.username;
    });

    console.log("player start freeze:", notFreezeUsername.username);
    io.emit("updateUser", JSON.stringify(onlineUsers));

    // Remove Freeze
    setTimeout(() => {
      // Only update if users still exist
      if (Object.keys(onlineUsers).length > 0) {
        Object.keys(onlineUsers).forEach((username) => {
          onlineUsers[username].freeze = false;
        });
        io.emit("updateUser", JSON.stringify(onlineUsers));
      }
    }, 400);
  });
  socket.on("playerDead", (data) => {
    const user = JSON.parse(data);
    const deadTime = user.deadtime;
    console.log(`player ${user.username} is dead at ${deadTime}`);

    // Update user state to mark as dead
    if (onlineUsers[user.username]) {
      onlineUsers[user.username].isdead = deadTime;
    }

    // Check if game is over (only one player left alive)
    const aliveUsers = Object.values(onlineUsers).filter(
      (user) => user.inGame === true && user.isdead === null
    );

    // Get all players who participated in the game
    console.log("onlineUsers length");
    console.log(onlineUsers);
    const gamePlayers = Object.values(onlineUsers);
    console.log("gamePlayers length");
    console.log(gamePlayers.length);

    // Sort players by their death time (null = still alive, comes first)
    const playerRank = gamePlayers.sort((a, b) => {
      if (a.isdead === null) return -1; // Alive players first
      if (b.isdead === null) return 1;
      return b.isdead - a.isdead; // Later death time = higher rank
    });

    console.log("playerRank length");
    console.log(playerRank.length);

    console.log("aliveUsers No. :", aliveUsers.length);
    if (aliveUsers.length <= 1) {
      io.emit("gameOver", playerRank);
    } else if (aliveUsers.length > 1) {
      io.emit("someoneDead", { playerRank, currentUsername: user.username });
    }
  });

  // Add this handler in your socket.on connection block
  socket.on("enterWaitingRoom", (username) => {
    // Mark this user as being in the waiting room
    usersInWaitingRoom.add(username);

    // Check if all online users are in waiting room
    const allUsers = Object.keys(onlineUsers);
    const allInWaitingRoom =
      allUsers.length === usersInWaitingRoom.size &&
      allUsers.every((user) => usersInWaitingRoom.has(user));

    // Send status update to all clients
    io.emit(
      "waitingRoomStatus",
      JSON.stringify({
        inWaitingRoom: usersInWaitingRoom.size,
        total: allUsers.length,
        allInWaitingRoom: allInWaitingRoom,
      })
    );

    // If all users are in waiting room, enable ready buttons
    if (allInWaitingRoom) {
      io.emit("enableReadyButtons");
    }
  });

  // Handle player leaving waiting room (disconnect or move to game)
  function leaveWaitingRoom(username) {
    if (usersInWaitingRoom.has(username)) {
      usersInWaitingRoom.delete(username);

      // Update waiting room status
      const allUsers = Object.keys(onlineUsers);
      io.emit(
        "waitingRoomStatus",
        JSON.stringify({
          inWaitingRoom: usersInWaitingRoom.size,
          total: allUsers.length,
          allInWaitingRoom: false,
        })
      );
    }
  }
});

// serving the backend server
const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
