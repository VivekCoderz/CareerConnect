const { Server } = require("socket.io");

let io = null;

/**
 * Initialize Socket.IO with HTTP server instance
 */
function init(httpServer) {
  const allowedOrigins = [
    process.env.CLIENT_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, or same origin)
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Permissive in dev to avoid disconnects
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    // console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join candidate/user room
    socket.on("join_user", (userId) => {
      if (userId) {
        const room = `user_${String(userId)}`;
        socket.join(room);
        // console.log(`[Socket.IO] Socket ${socket.id} joined ${room}`);
      }
    });

    // Join candidate-specific room
    socket.on("join_candidate", (candidateId) => {
      if (candidateId) {
        const room = `candidate_${String(candidateId)}`;
        socket.join(room);
        // console.log(`[Socket.IO] Socket ${socket.id} joined ${room}`);
      }
    });

    // Join interview-specific room
    socket.on("join_interview", (interviewId) => {
      if (interviewId) {
        const room = `interview_${String(interviewId)}`;
        socket.join(room);
        // console.log(`[Socket.IO] Socket ${socket.id} joined ${room}`);
      }
    });

    // Leave rooms
    socket.on("leave_interview", (interviewId) => {
      if (interviewId) {
        socket.leave(`interview_${String(interviewId)}`);
      }
    });

    socket.on("disconnect", () => {
      // console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.IO service initialized successfully ⚡");
  return io;
}

/**
 * Get active IO instance
 */
function getIO() {
  return io;
}

/**
 * Emit an event to candidate rooms and interview room
 */
function emitToCandidateAndInterview(candidateId, interviewId, eventName, payload) {
  if (!io) return;
  try {
    const candidateStr = candidateId ? String(candidateId) : null;
    const interviewStr = interviewId ? String(interviewId) : null;

    if (candidateStr) {
      io.to(`user_${candidateStr}`).emit(eventName, payload);
      io.to(`candidate_${candidateStr}`).emit(eventName, payload);
    }
    if (interviewStr) {
      io.to(`interview_${interviewStr}`).emit(eventName, payload);
    }
    // Also emit broadcast event for any active dashboard listeners
    io.emit(eventName, payload);
  } catch (err) {
    console.error(`Failed to emit socket event ${eventName}:`, err.message);
  }
}

/**
 * Notify that an interview has been rescheduled
 */
function emitInterviewRescheduled(candidateId, interview) {
  const payload = {
    type: "INTERVIEW_RESCHEDULED",
    interviewId: interview._id,
    candidateId: candidateId || interview.candidateId?._id || interview.candidateId,
    interview,
    timestamp: new Date().toISOString(),
  };
  emitToCandidateAndInterview(payload.candidateId, interview._id, "INTERVIEW_RESCHEDULED", payload);
}

/**
 * Notify that an interview has been cancelled
 */
function emitInterviewCancelled(candidateId, interview) {
  const payload = {
    type: "INTERVIEW_CANCELLED",
    interviewId: interview._id,
    candidateId: candidateId || interview.candidateId?._id || interview.candidateId,
    interview,
    timestamp: new Date().toISOString(),
  };
  emitToCandidateAndInterview(payload.candidateId, interview._id, "INTERVIEW_CANCELLED", payload);
}

/**
 * Notify that an interview has been scheduled
 */
function emitInterviewScheduled(candidateId, interview) {
  const payload = {
    type: "INTERVIEW_SCHEDULED",
    interviewId: interview._id,
    candidateId: candidateId || interview.candidateId?._id || interview.candidateId,
    interview,
    timestamp: new Date().toISOString(),
  };
  emitToCandidateAndInterview(payload.candidateId, interview._id, "INTERVIEW_SCHEDULED", payload);
}

/**
 * Notify that an interview status has updated (e.g. completed, ongoing)
 */
function emitInterviewStatusUpdated(candidateId, interview) {
  const payload = {
    type: "INTERVIEW_STATUS_UPDATED",
    interviewId: interview._id,
    candidateId: candidateId || interview.candidateId?._id || interview.candidateId,
    interview,
    timestamp: new Date().toISOString(),
  };
  emitToCandidateAndInterview(payload.candidateId, interview._id, "INTERVIEW_STATUS_UPDATED", payload);
}

module.exports = {
  init,
  getIO,
  emitInterviewRescheduled,
  emitInterviewCancelled,
  emitInterviewScheduled,
  emitInterviewStatusUpdated,
};
