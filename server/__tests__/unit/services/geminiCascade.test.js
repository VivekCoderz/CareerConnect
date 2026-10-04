const { runWithGeminiCascade } = require("../../../services/geminiCascade");

describe("runWithGeminiCascade (G09)", () => {
  const originalMax = process.env.GEMINI_MAX_CALLS;
  afterEach(() => {
    if (originalMax === undefined) delete process.env.GEMINI_MAX_CALLS;
    else process.env.GEMINI_MAX_CALLS = originalMax;
  });

  it("returns the first successful result with one call", async () => {
    const call = jest.fn().mockResolvedValue("ok");

    await expect(runWithGeminiCascade(call, { retryDelayMs: 0 })).resolves.toBe("ok");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("makes at most 2 calls when every model fails", async () => {
    const call = jest.fn().mockRejectedValue(new Error("model not found"));

    await expect(runWithGeminiCascade(call, { retryDelayMs: 0 })).rejects.toThrow("model not found");
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("moves to another model when Google reports high demand (503)", async () => {
    const call = jest.fn()
      .mockRejectedValueOnce(new Error("[503 Service Unavailable] This model is currently experiencing high demand"))
      .mockResolvedValueOnce("ok");

    await expect(runWithGeminiCascade(call, { retryDelayMs: 0 })).resolves.toBe("ok");
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[0][0]).not.toBe(call.mock.calls[1][0]);
  });

  it("moves to a different model after a permanent error", async () => {
    const call = jest.fn()
      .mockRejectedValueOnce(new Error("model not found"))
      .mockResolvedValueOnce("ok");

    await expect(runWithGeminiCascade(call, { retryDelayMs: 0 })).resolves.toBe("ok");
    expect(call.mock.calls[0][0]).not.toBe(call.mock.calls[1][0]);
  });

  it("respects GEMINI_MAX_CALLS", async () => {
    process.env.GEMINI_MAX_CALLS = "1";
    const call = jest.fn().mockRejectedValue(new Error("model not found"));

    await expect(runWithGeminiCascade(call, { retryDelayMs: 0 })).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });
});
