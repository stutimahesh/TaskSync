import { io } from "socket.io-client";
import { setSocketId } from "./api.js";

// One shared connection per signed-in user.
let socket = null;
let socketToken = null;

export function getSocket(token) {
  if (socket && socketToken === token) return socket;
  closeSocket();

  socket = io({ auth: { token }, transports: ["websocket", "polling"] });
  socketToken = token;
  socket.on("connect", () => setSocketId(socket.id));
  socket.on("disconnect", () => setSocketId(null));
  return socket;
}

export function closeSocket() {
  if (!socket) return;
  socket.disconnect();
  socket = null;
  socketToken = null;
  setSocketId(null);
}
