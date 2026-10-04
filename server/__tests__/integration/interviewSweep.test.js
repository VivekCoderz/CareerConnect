const mongoose = require("mongoose");
const Interview = require("../../models/Interview");
const socketService = require("../../services/socketService");
const { buildSweepFilter, sweepPastInterviews } = require("../../services/interviewSweep");

// Interview times are interpreted in the server's local time zone (as getInterviewTimeDetails
// does), so the fixed "now" and expected end times are built with local-time Date constructors.
const NOW = new Date(2026, 2, 10, 12, 0, 0, 0); // 10 Mar 2026, 12:00 local
const at = (h, m, day = 10) => new Date(2026, 2, day, h, m, 0, 0);
const oid = () => new mongoose.Types.ObjectId();

const makeInterview = (overrides = {}) =>
  Interview.create({
    employerId: oid(),
    candidateId: oid(),
    applicationId: oid(),
    scheduledDate: "2026-03-10",
    startTime: "10:00",
    duration: 45,
    status: "scheduled",
    ...overrides,
  });

describe("interview sweep (I07)", () => {
  let emitSpy;

  beforeAll(() => Interview.init()); // build indexes before explain()

  beforeEach(() => {
    emitSpy = jest.spyOn(socketService, "emitInterviewStatusUpdated").mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it("completes interviews whose end time has passed, with completedAt = end time", async () => {
    const past = await makeInterview({ startTime: "10:00", duration: 45 });
    const rescheduledPast = await makeInterview({ status: "rescheduled", startTime: "09:00", endTime: "09:30" });

    const result = await sweepPastInterviews({ now: NOW });

    expect(result.completed).toBe(2);
    const stored = await Interview.findById(past._id).lean();
    expect(stored.status).toBe("completed");
    expect(stored.completedAt.getTime()).toBe(at(10, 45).getTime());
    expect((await Interview.findById(rescheduledPast._id).lean()).completedAt.getTime()).toBe(at(9, 30).getTime());

    expect(emitSpy).toHaveBeenCalledTimes(2);
    const [candidateId, payload] = emitSpy.mock.calls.find(([, p]) => String(p._id) === String(past._id));
    expect(String(candidateId)).toBe(String(past.candidateId));
    expect(payload.status).toBe("completed");
  });

  it("leaves future and in-progress interviews scheduled", async () => {
    const inProgress = await makeInterview({ startTime: "11:30", duration: 60 }); // ends 12:30
    const future = await makeInterview({ scheduledDate: "2026-03-11" });

    const result = await sweepPastInterviews({ now: NOW });

    expect(result.completed).toBe(0);
    expect((await Interview.findById(inProgress._id).lean()).status).toBe("scheduled");
    expect((await Interview.findById(future._id).lean()).status).toBe("scheduled");
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("never auto-completes AI interviews", async () => {
    const byType = await makeInterview({ interviewType: "AI Interview" });
    // interviewFormat comes with the AI interview branch; insert it directly here.
    const { insertedId } = await Interview.collection.insertOne({
      employerId: oid(), candidateId: oid(), applicationId: oid(),
      scheduledDate: "2026-03-10", startTime: "10:00", duration: 45,
      scheduledAt: at(10, 0), status: "scheduled", interviewFormat: "ai",
    });

    expect((await sweepPastInterviews({ now: NOW })).completed).toBe(0);
    expect((await Interview.findById(byType._id).lean()).status).toBe("scheduled");
    expect((await Interview.collection.findOne({ _id: insertedId })).status).toBe("scheduled");
  });

  it("leaves already completed or cancelled interviews untouched", async () => {
    const earlier = at(10, 40);
    const done = await makeInterview({ status: "completed", completedAt: earlier });
    const cancelled = await makeInterview({ status: "cancelled" });

    await sweepPastInterviews({ now: NOW });

    const storedDone = await Interview.findById(done._id).lean();
    expect(storedDone.completedAt.getTime()).toBe(earlier.getTime());
    expect((await Interview.findById(cancelled._id).lean()).status).toBe("cancelled");
  });

  it("handles older interviews without scheduledAt and backfills it", async () => {
    const base = { employerId: oid(), candidateId: oid(), applicationId: oid(), status: "scheduled", duration: 45 };
    const { insertedIds } = await Interview.collection.insertMany([
      { ...base, scheduledDate: "2026-03-10", startTime: "10:00" },
      { ...base, scheduledDate: "2026-03-12", startTime: "10:00" },
    ]);

    const result = await sweepPastInterviews({ now: NOW });

    expect(result).toMatchObject({ completed: 1, backfilled: 2 });
    const [pastLegacy, futureLegacy] = await Promise.all([
      Interview.collection.findOne({ _id: insertedIds[0] }),
      Interview.collection.findOne({ _id: insertedIds[1] }),
    ]);
    expect(pastLegacy.status).toBe("completed");
    expect(futureLegacy.status).toBe("scheduled");
    expect(futureLegacy.scheduledAt.getTime()).toBe(at(10, 0, 12).getTime());
  });

  it("keeps scheduledAt in step when an interview is rescheduled", async () => {
    const interview = await makeInterview({ scheduledDate: "2026-03-20", startTime: "15:00" });
    expect(interview.scheduledAt.getTime()).toBe(at(15, 0, 20).getTime());

    interview.scheduledDate = "2026-03-10";
    interview.startTime = "09:00";
    interview.status = "rescheduled";
    await interview.save();

    expect((await Interview.findById(interview._id).lean()).scheduledAt.getTime()).toBe(at(9, 0).getTime());
    expect((await sweepPastInterviews({ now: NOW })).completed).toBe(1);
  });

  it("queries by status and scheduledAt through an index", async () => {
    const filter = buildSweepFilter(NOW);
    expect(filter.scheduledAt).toEqual({ $lte: NOW });
    expect(filter.status.$in).toEqual(expect.arrayContaining(["scheduled", "rescheduled"]));

    await makeInterview();
    const plan = JSON.stringify(await Interview.find(filter).explain("queryPlanner"));
    expect(plan).not.toContain("COLLSCAN");
    expect(plan).toMatch(/IXSCAN/);
    expect(plan).toMatch(/scheduledAt/);
  });

  it("logs a failure once and does not throw", async () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(Interview, "find").mockImplementation(() => { throw new Error("db down"); });

    const result = await sweepPastInterviews({ now: NOW });

    expect(result.error).toBe("db down");
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0].join(" ")).toMatch(/interview sweep.*db down/);
  });
});
