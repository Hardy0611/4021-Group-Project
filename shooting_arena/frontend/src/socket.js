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
      socket.disconnect();
      socket = null;
      console.log("Socket disconnected");
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

  return { connect, disconnect, getSocket, onUpdateUsers };
})();

export default Socket;