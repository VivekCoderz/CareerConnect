const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const EmployerProfile = require("../models/EmployerProfile");
const Interview = require("../models/Interview");
const { parseClientUrls, isLocalDevOrigin } = require("../utils/clientOrigins");

let io = null;

const idOf = (value) => {
  const id = value?._id || value;
  return id ? String(id) : null;
};

const isEmployerUser = (user) =>
  user.role === "employer" ||
  user.userType === "employer" ||
  user.role === "COMPANY_ADMIN" ||
  user.adminLevel === "COMPANY_ADMIN";

/**
 * Only CLIENT_URL origins (plus localhost outside production) may open a socket.
 * Browsers always send Origin on WebSocket and cross-origin polling requests,
 * so a missing Origin is rejected as well.
 */
function createOriginCheck() {
  const isProduction = process.env.NODE_ENV === "production" || process.env.RENDER === "true";
  const allowed = parseClientUrls();
  return (origin) =>
    Boolean(origin) && (allowed.includes(origin) || (!isProduction && isLocalDevOrigin(origin)));
}

function readCookie(cookieHeader, name) {
  for (const part of String(cookieHeader || "").split(";")) {
    const index = part.indexOf("=");
    if (index === -1 || part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Handshake auth: same `token` cookie and checks as the JWT path of authMiddleware
 * (signature, user exists, authVersion matches, account active).
 */
async function authenticateSocket(socket, next) {
  try {
    const token = readCookie(socket.handshake.headers.cookie, "token");
    if (!token || token === "null" || token === "undefined" || !process.env.JWT_SECRET) {
      return next(new Error("NOT_AUTHENTICATED"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id role userType adminLevel authVersion isActive");
    if (!user || (decoded.av || 0) !== (user.authVersion || 0) || user.isActive === false) {
      return next(new Error("NOT_AUTHENTICATED"));
    }

    let employerProfileId = null;
    if (isEmployerUser(user)) {
      const profile = await EmployerProfile.findOne({ userId: user._id }).select("_id").lean();
      employerProfileId = profile ? String(profile._id) : null;
    }

    socket.data.user = {
      id: String(user._id),
      role: user.role,
      userType: user.userType,
      isEmployer: isEmployerUser(user),
      employerProfileId,
    };
    return next();
  } catch {
    return next(new Error("NOT_AUTHENTICATED"));
  }
}

// Rooms a socket may join are derived from the authenticated user only.
function ownRooms(user) {
  const rooms = [`user_${user.id}`];
  if (user.isEmployer) {
    if (user.employerProfileId) rooms.push(`employer_${user.employerProfileId}`);
    // Older interviews stored the employer's user id in employerId.
    rooms.push(`employer_${user.id}`);
  }
  return rooms;
}

async function canJoinInterview(user, interviewId) {
  if (!mongoose.isValidObjectId(interviewId)) return false;
  const interview = await Interview.findById(interviewId).select("candidateId employerId").lean();
  if (!interview) return false;

  if (idOf(interview.candidateId) === user.id) return true;
  const employerId = idOf(interview.employerId);
  return Boolean(
    user.isEmployer && employerId && (employerId === user.employerProfileId || employerId === user.id)
  );
}

/**
 * Initialize Socket.IO with HTTP server instance
 */
function init(httpServer) {
  const isAllowedOrigin = createOriginCheck();

  io = new Server(httpServer, {
    // allowRequest covers every transport; cors only governs browser polling responses.
    allowRequest: (req, callback) => callback(null, isAllowedOrigin(req.headers.origin)),
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = socket.data.user;
    socket.join(ownRooms(user));

    // Join an interview room only as its candidate or its employer; otherwise ignored.
    socket.on("join_interview", async (interviewId, ack) => {
      const joined = await canJoinInterview(user, interviewId).catch(() => false);
      if (joined) socket.join(`interview_${String(interviewId)}`);
      if (typeof ack === "function") ack({ joined });
    });

    socket.on("leave_interview", (interviewId) => {
      if (interviewId) socket.leave(`interview_${String(interviewId)}`);
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

function emitToRooms(rooms, eventName, payload) {
  if (!io) return;
  const targets = [...new Set(rooms.filter(Boolean))];
  if (targets.length === 0) return;
  try {
    io.to(targets).emit(eventName, payload);
  } catch (err) {
    console.error(`Failed to emit socket event ${eventName}:`, err.message);
  }
}

/**
 * Interview events go to the candidate, the owning employer and the interview room.
 * Payloads carry identifiers and status only; clients refetch details over the API.
 */
function emitInterviewEvent(type, candidateId, interview) {
  const interviewId = idOf(interview?._id);
  if (!interviewId) return;
  const candidate = idOf(candidateId) || idOf(interview.candidateId);
  const employer = idOf(interview.employerId);

  const payload = {
    type,
    interviewId,
    applicationId: idOf(interview.applicationId),
    candidateId: candidate,
    status: interview.status || null,
    timestamp: new Date().toISOString(),
  };
  emitToRooms(
    [candidate && `user_${candidate}`, employer && `employer_${employer}`, `interview_${interviewId}`],
    type,
    payload
  );
}

const emitInterviewRescheduled = (candidateId, interview) =>
  emitInterviewEvent("INTERVIEW_RESCHEDULED", candidateId, interview);
const emitInterviewCancelled = (candidateId, interview) =>
  emitInterviewEvent("INTERVIEW_CANCELLED", candidateId, interview);
const emitInterviewScheduled = (candidateId, interview) =>
  emitInterviewEvent("INTERVIEW_SCHEDULED", candidateId, interview);
const emitInterviewStatusUpdated = (candidateId, interview) =>
  emitInterviewEvent("INTERVIEW_STATUS_UPDATED", candidateId, interview);

/**
 * Notify the candidate and the owning employer that an application status or stage changed
 */
function emitApplicationUpdated(application) {
  const applicationId = idOf(application?._id);
  if (!applicationId) return;
  const candidate = idOf(application.candidateId);
  const employer = idOf(application.employerId);

  const payload = {
    type: "APPLICATION_UPDATED",
    applicationId,
    candidateId: candidate,
    status: application.status || null,
    timestamp: new Date().toISOString(),
  };
  emitToRooms(
    [candidate && `user_${candidate}`, employer && `employer_${employer}`],
    "APPLICATION_UPDATED",
    payload
  );
}

module.exports = {
  init,
  getIO,
  emitInterviewRescheduled,
  emitInterviewCancelled,
  emitInterviewScheduled,
  emitInterviewStatusUpdated,
  emitApplicationUpdated,
};
