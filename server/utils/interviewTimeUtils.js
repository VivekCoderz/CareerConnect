/**
 * interviewTimeUtils.js
 * Comprehensive date & time parser and validator for CareerConnect Interview Management.
 * Handles ISO dates (YYYY-MM-DD), month name strings, 12h/24h time formats,
 * range strings ("02:00 PM - 02:45 PM"), and duration-based end time calculation.
 */

/**
 * Parses time string (e.g. "02:00 PM", "2:00pm", "14:00") into { hours, minutes } in 24-hour format
 */
function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return null;
  const cleaned = timeStr.trim();
  
  // Match "HH:MM AM/PM" or "HH:MM"
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const modifier = match[3] ? match[3].toUpperCase() : null;

  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;

  if (modifier === "PM" && hours < 12) {
    hours += 12;
  } else if (modifier === "AM" && hours === 12) {
    hours = 0;
  }

  if (hours < 0 || hours > 23) return null;

  return { hours, minutes };
}

/**
 * Parses date string (e.g. "2026-09-12", "12 September 2026", "2026-09-12T00:00:00Z") into { year, month, day }
 */
function parseDateParts(dateStr) {
  if (!dateStr) return null;

  if (typeof dateStr === "string") {
    // YYYY-MM-DD
    const isoMatch = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return {
        year: parseInt(isoMatch[1], 10),
        month: parseInt(isoMatch[2], 10) - 1, // 0-indexed
        day: parseInt(isoMatch[3], 10),
      };
    }

    // Try standard Date parsing for "12 September 2026"
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getFullYear(),
        month: parsed.getMonth(),
        day: parsed.getDate(),
      };
    }
  } else if (dateStr instanceof Date && !isNaN(dateStr.getTime())) {
    return {
      year: dateStr.getFullYear(),
      month: dateStr.getMonth(),
      day: dateStr.getDate(),
    };
  }

  return null;
}

/**
 * Extracts start time and end time strings from interview object
 * Supports:
 * - Range inside startTime/scheduledTime: "02:00 PM - 02:45 PM"
 * - Discrete startTime and endTime fields
 * - Discrete startTime + duration in minutes
 */
function extractTimeStrings(interview) {
  let rawStart = interview.startTime || interview.scheduledTime || "";
  let rawEnd = interview.endTime || "";
  const duration = Number(interview.durationMinutes || interview.duration || 45);

  if (typeof rawStart === "string" && rawStart.includes(" - ")) {
    const parts = rawStart.split(" - ");
    rawStart = parts[0].trim();
    if (!rawEnd && parts[1]) {
      rawEnd = parts[1].trim();
    }
  }

  return {
    rawStart: rawStart.trim(),
    rawEnd: rawEnd.trim(),
    duration: isNaN(duration) || duration <= 0 ? 45 : duration,
  };
}

/**
 * Calculates start Date and end Date objects for an interview
 */
function getInterviewDateTimes(interview) {
  const dateParts = parseDateParts(interview.scheduledDate);
  if (!dateParts) return null;

  const { rawStart, rawEnd, duration } = extractTimeStrings(interview);
  const startTimeParsed = parseTimeString(rawStart);

  // If no start time is specified, default to 11:00 AM
  const startH = startTimeParsed ? startTimeParsed.hours : 11;
  const startM = startTimeParsed ? startTimeParsed.minutes : 0;

  const startDateTime = new Date(dateParts.year, dateParts.month, dateParts.day, startH, startM, 0, 0);

  let endDateTime = null;
  const endTimeParsed = parseTimeString(rawEnd);
  if (endTimeParsed) {
    endDateTime = new Date(dateParts.year, dateParts.month, dateParts.day, endTimeParsed.hours, endTimeParsed.minutes, 0, 0);
    // If end time is before start time on the same day (e.g. overnight), add 1 day
    if (endDateTime.getTime() <= startDateTime.getTime()) {
      endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
    }
  } else {
    endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);
  }

  return { startDateTime, endDateTime, duration };
}

/**
 * Returns complete lifecycle assessment for an interview relative to referenceTime (default: now)
 */
function getInterviewTimeDetails(interview, referenceTime = new Date()) {
  if (!interview) {
    return {
      isValid: false,
      isUpcoming: false,
      isOngoing: false,
      isPast: true,
      computedStatus: "completed",
    };
  }

  const now = referenceTime instanceof Date ? referenceTime : new Date(referenceTime);
  const rawStatus = (interview.status || "").toLowerCase();
  const times = getInterviewDateTimes(interview);

  if (!times) {
    // If date cannot be parsed, rely on existing status
    return {
      isValid: false,
      isUpcoming: rawStatus === "scheduled" || rawStatus === "rescheduled",
      isOngoing: false,
      isPast: rawStatus === "completed" || rawStatus === "cancelled" || rawStatus === "no_show",
      computedStatus: rawStatus || "scheduled",
    };
  }

  const { startDateTime, endDateTime, duration } = times;
  const isCancelled = rawStatus === "cancelled";
  const isExplicitCompleted = rawStatus === "completed";
  const isNoShow = rawStatus === "no_show";

  // Strict time comparisons:
  // Upcoming: status is scheduled/rescheduled/ongoing AND current time is strictly before endDateTime
  const isTimePast = now.getTime() >= endDateTime.getTime();
  const isTimeOngoing = now.getTime() >= startDateTime.getTime() && now.getTime() < endDateTime.getTime();
  const isTimeBefore = now.getTime() < startDateTime.getTime();

  let computedStatus = rawStatus;
  let isUpcoming = false;
  let isOngoing = false;
  let isPast = false;

  if (isCancelled) {
    computedStatus = "cancelled";
    isPast = true;
  } else if (isNoShow) {
    computedStatus = "no_show";
    isPast = true;
  } else if (isExplicitCompleted || isTimePast) {
    computedStatus = "completed";
    isPast = true;
  } else if (isTimeOngoing) {
    computedStatus = "ongoing";
    isUpcoming = true;
    isOngoing = true;
  } else {
    // Before start time and active
    computedStatus = rawStatus === "rescheduled" ? "rescheduled" : "scheduled";
    isUpcoming = true;
  }

  return {
    isValid: true,
    startDateTime,
    endDateTime,
    duration,
    isTimePast,
    isTimeOngoing,
    isTimeBefore,
    isUpcoming,
    isOngoing,
    isPast,
    computedStatus,
  };
}

function isUpcomingInterview(interview, referenceTime = new Date()) {
  return getInterviewTimeDetails(interview, referenceTime).isUpcoming;
}

function isPastInterview(interview, referenceTime = new Date()) {
  return getInterviewTimeDetails(interview, referenceTime).isPast;
}

function isOngoingInterview(interview, referenceTime = new Date()) {
  return getInterviewTimeDetails(interview, referenceTime).isOngoing;
}

module.exports = {
  parseTimeString,
  parseDateParts,
  extractTimeStrings,
  getInterviewDateTimes,
  getInterviewTimeDetails,
  isUpcomingInterview,
  isPastInterview,
  isOngoingInterview,
};
