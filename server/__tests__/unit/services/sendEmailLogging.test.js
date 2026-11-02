jest.mock("sib-api-v3-sdk", () => {
  const sendTransacEmail = jest.fn().mockResolvedValue({ messageId: "msg-1" });
  return {
    ApiClient: { instance: { authentications: { "api-key": {} } } },
    TransactionalEmailsApi: jest.fn(() => ({ sendTransacEmail })),
    SendSmtpEmail: jest.fn(() => ({})),
    __sendTransacEmail: sendTransacEmail,
  };
});

const sendEmail = require("../../../utils/sendEmail");

describe("sendEmail logging", () => {
  const saved = { key: process.env.BREVO_API_KEY, user: process.env.EMAIL_USER };
  let logs;

  beforeEach(() => {
    process.env.BREVO_API_KEY = "test-key";
    process.env.EMAIL_USER = "noreply@careerconnect.test";
    logs = [];
    for (const level of ["log", "warn", "error"]) {
      jest.spyOn(console, level).mockImplementation((...args) => logs.push(args.map(String).join(" ")));
    }
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.BREVO_API_KEY = saved.key;
    process.env.EMAIL_USER = saved.user;
  });

  it("never logs a full recipient address", async () => {
    const result = await sendEmail({
      to: ["vivek.garg@gmail.com", { email: "ram@example.com" }],
      subject: "Interview scheduled",
      html: "<p>Hi</p>",
    });

    expect(result.messageId).toBe("msg-1");
    const output = logs.join("\n");
    expect(output).not.toMatch(/vivek\.garg@gmail\.com|ram@example\.com/);
    expect(output).toContain("v***g@gmail.com");
    expect(output).toContain("Interview scheduled");
  });
});
