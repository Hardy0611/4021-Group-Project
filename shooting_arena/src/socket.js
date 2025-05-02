import { io } from "socket.io-client"; // Only if using a bundler like webpack/vite

const Socket = (function () {
  let socket = null;
  const connect = (serverUrl) => {
    if (!socket) {
      socket = io(serverUrl);
    }
    socket.on("connect", () => {
      console.log("Connected to server");
    });
    socket.on("disconnect", () => {
      console.log("Disconnected from server");
    });
  };
  const disconnect = function () {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };
  const getSocket = function () {
    return socket;
  };
  return { connect, disconnect, getSocket };
})();

export default Socket;
