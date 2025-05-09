# 4021 Group Project: Group 39
Fan Tsz Ho, LOHANAKAKUL Sasatorn

## Getting Started

This project has separate frontend and backend folders. Please follow the steps below to set up each part.

### 1. Clone the repository
```bash
git clone https://github.com/your-username/4021-Group-Project.git
cd 4021-Group-Project
```

### 2. Install dependencies

**Backend:**
```bash
cd shooting_area/backend
npm install
```

**Frontend:**
```bash
cd ../../shooting_area/frontend
npm install
```

### 3. Start the backend server

```bash
cd shooting_area/backend
node server.js
```

### 4. Start the frontend (Vite dev server)

Open a new terminal, then run:
```bash
cd shooting_area/frontend
npm run dev
```

### 5. Open your browser and go to

```
http://localhost:5173
```

**Note:**  
Make sure that `localhost:3000` is available for the backend server connection. If another service is using this port, stop it or change the backend server port in your configuration.

If you want to test the multiplayer function on your local machine, please use different browsers or incognito/private windows for each player.  
Our game supports more than 2 players, but browsers may have issues with cookies when opening multiple tabs in the same browser.

!!! Do not reload during the game, as the room will be closed once the game started. If reload accidently, all the remaining players need to logout and refresh the page to pair new game. !!!