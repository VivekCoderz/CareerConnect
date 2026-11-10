import { io } from "socket.io-client";

// One Socket.IO connection to the API, shared by everything that listens for realtime
// events (H17). The server authenticates it with the httpOnly `token` cookie, so the
// connection goes to the API's own origin with credentials.
// In development Vite proxies /socket.io to the API, so the page's origin is used.
const socketOrigin = () => {
  const apiUrl = import.meta.env.DEV ? "" : import.meta.env.VITE_API_URL || "";
  try {
    return apiUrl ? new URL(apiUrl, window.location.href).origin : window.location.origin;
  } catch {
    return window.location.origin;
  }
};

let socket = null;
let users = 0;

/** The shared socket, connecting it on first use. Pair every call with releaseSocket(). */
export const acquireSocket = () => {
  if (!socket) {
    socket = io(socketOrigin(), {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  users += 1;
  return socket;
};

/** Disconnects the shared socket when its last user lets go of it. */
export const releaseSocket = () => {
  users = Math.max(0, users - 1);
  if (users === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
};
