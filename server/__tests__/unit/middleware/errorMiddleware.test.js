const fs = require("fs");
const path = require("path");
const Sentry = require("@sentry/node");
const { errorHandler, GENERIC_MESSAGE } = require("../../../middleware/errorMiddleware");
const AppError = require("../../../utils/AppError");

const run = (err) => {
  const res = {
    headersSent: false,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  errorHandler(err, { path: "/test" }, res, jest.fn());
  return { status: res.status.mock.calls[0][0], body: res.json.mock.calls[0][0] };
};

describe("errorHandler", () => {
  let capture;
  beforeEach(() => {
    capture = jest.spyOn(Sentry, "captureException").mockImplementation(() => "event-id");
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it("hides the message of an unexpected error and reports it", () => {
    const { status, body } = run(new Error("connect ECONNREFUSED 10.0.0.5:27017"));

    expect(status).toBe(500);
    expect(body).toEqual({ success: false, message: GENERIC_MESSAGE });
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it("hides the message of a 5xx error even when it carries a status code", () => {
    const err = Object.assign(new Error("Tectonic binary missing at /usr/bin"), { statusCode: 503 });

    expect(run(err)).toEqual({ status: 503, body: { success: false, message: GENERIC_MESSAGE } });
  });

  it("shows the message of a 4xx AppError without reporting it", () => {
    expect(run(new AppError(404, "Job not found"))).toEqual({
      status: 404,
      body: { success: false, message: "Job not found" },
    });
    expect(capture).not.toHaveBeenCalled();
  });

  it("shows a 5xx message only when it is marked safe", () => {
    const { status, body } = run(new AppError(503, "Resume generation is busy. Please try again shortly.", { expose: true }));

    expect(status).toBe(503);
    expect(body.message).toBe("Resume generation is busy. Please try again shortly.");
  });
});

describe("controllers", () => {
  // Any res.json(...) / res.status(..).json(...) body that reads .message or .stack of an error.
  const LEAK = /\.json\(\{[^]*?\}\)/g;
  const ERROR_TEXT = /\b\w*(?:err|error|Err|Error|e)\.(?:message|stack)\b/;
  const dir = path.join(__dirname, "../../../controllers");

  it.each(fs.readdirSync(dir).filter((f) => f.endsWith(".js")))("%s never sends an error's message to the client", (file) => {
    const source = fs.readFileSync(path.join(dir, file), "utf8");
    const leaks = (source.match(LEAK) || []).filter((body) => ERROR_TEXT.test(body));

    expect(leaks).toEqual([]);
  });
});
