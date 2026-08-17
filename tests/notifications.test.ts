import { describe, expect, it } from "vitest";
import { sendOtpSms, sendOtpEmail } from "@/lib/notifications";

describe("SMS & Notification Gateway Dispatcher", () => {
  it("dispatches SMS OTP cleanly in mock development mode", async () => {
    const res = await sendOtpSms("9876543210", "123456");
    expect(res.success).toBe(true);
    expect(res.provider).toBe("mock");
    expect(res.messageId).toBeDefined();
  });

  it("dispatches Email OTP cleanly in mock development mode", async () => {
    const res = await sendOtpEmail("test@backhaul.app", "654321");
    expect(res.success).toBe(true);
    expect(res.provider).toBe("mock");
    expect(res.messageId).toBeDefined();
  });
});
