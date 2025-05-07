import { io } from "socket.io-client"; // Only if using a bundler like webpack/vite

const Socket = (function () {
  let socket = null;
  
  const connect = (serverUrl, onConnected) => {
    if (!socket) {
      socket = io(serverUrl);
    }
    socket.on("connect", () => {
      console.log("Connected to server");
      if (onConnected) onConnected();
    });
    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  };
  
  const disconnect = function () {
    if (socket) {
      // Explicitly notify the server about user logout before disconnecting
      if (window.currentUser) {
        socket.emit("userLogout", window.currentUser.username);
      }
      
      // Give the server a moment to process the logout event before disconnecting
      setTimeout(() => {
        socket.disconnect();
        socket = null;
        console.log("Socket disconnected");
      }, 200);
    }
  };
  
  const getSocket = function () {
    return socket;
  };
  
  const onUpdateUsers = (callback) => {
    if (socket) {
      socket.on("updateUser", (data) => {
        const users = JSON.parse(data);
        callback(users);
      });
    }
  };

  const gotHit = (callback) => {
    if(socket) {
      socket.on("hitPlayer", (data) =>{
        const user = JSON.parse(data);
        callback(user);
      } )
    }
  }

  return { connect, disconnect, getSocket, onUpdateUsers, gotHit };
})();

export default Socket;