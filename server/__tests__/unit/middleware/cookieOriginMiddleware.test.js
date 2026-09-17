const cookieOriginMiddleware = require("../../../middleware/cookieOriginMiddleware");

const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
const request = (origin, cookie = "token", authorization = undefined) => ({
  method: "POST",
  cookies: cookie ? { token: cookie } : {},
  headers: { authorization },
  get: (name) => name === "Origin" ? origin : undefined,
});

describe("cookie origin protection", () => {
  const middleware = cookieOriginMiddleware(["https://careerconnect.example.com"], true);

  it("rejects a forged or missing browser origin for cookie writes", () => {
    for (const origin of ["https://evil.example.com", undefined]) {
      const res = response();
      const next = jest.fn();
      middleware(request(origin), res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("allows the configured frontend and bearer-token API clients", () => {
    const next = jest.fn();
    middleware(request("https://careerconnect.example.com"), response(), next);
    middleware(request(undefined, "", "Bearer api-token"), response(), next);
    expect(next).toHaveBeenCalledTimes(2);
  });
});
