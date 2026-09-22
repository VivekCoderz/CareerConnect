import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const socketUrl = import.meta.env.DEV
      ? window.location.origin
      : import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || window.location.origin;

    socket = io(socketUrl, {
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on("connect", () => {
      const savedUser = localStorage.getItem("user");
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u?._id) {
            socket.emit("join_user", u._id);
            socket.emit("join_candidate", u._id);
          }
        } catch {}
      }
    });
  }
  return socket;
};

export const joinUserRoom = (userId) => {
  const s = getSocket();
  if (s && userId) {
    s.emit("join_user", String(userId));
    s.emit("join_candidate", String(userId));
  }
};

export const subscribeToEvent = (eventName, callback) => {
  const s = getSocket();
  if (s) {
    s.on(eventName, callback);
  }
  return () => {
    if (s) {
      s.off(eventName, callback);
    }
  };
};

export default {
  getSocket,
  joinUserRoom,
  subscribeToEvent,
};
