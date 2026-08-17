import { getAppConfig } from "./config";

export type SmsDeliveryResult = {
  success: boolean;
  provider: "twilio" | "fast2sms" | "mock";
  messageId?: string;
  error?: string;
};

export type EmailDeliveryResult = {
  success: boolean;
  provider: "smtp" | "mock";
  messageId?: string;
  error?: string;
};

export async function sendOtpSms(phone: string, otp: string): Promise<SmsDeliveryResult> {
  const cfg = getAppConfig();
  const messageBody = `Your Backhaul verification code is: ${otp}. Valid for 10 minutes. Do not share this OTP with anyone.`;

  // 1. Twilio Gateway Delivery
  if (cfg.twilioAccountSid && cfg.twilioAuthToken && cfg.twilioPhoneNumber) {
    try {
      const auth = Buffer.from(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`).toString("base64");
      const body = new URLSearchParams({
        To: phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`,
        From: cfg.twilioPhoneNumber,
        Body: messageBody,
      });

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioAccountSid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const json = await res.json();
      if (res.ok && json.sid) {
        return { success: true, provider: "twilio", messageId: json.sid };
      }
      return { success: false, provider: "twilio", error: json.message || "Twilio delivery failed" };
    } catch (err: any) {
      return { success: false, provider: "twilio", error: err.message };
    }
  }

  // 2. Generic REST SMS Gateway (e.g. Fast2SMS / MSG91)
  if (cfg.smsGatewayApiKey) {
    try {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: cfg.smsGatewayApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: otp,
          numbers: phone.replace(/\D/g, ""),
        }),
      });

      const json = await res.json();
      if (res.ok && json.return) {
        return { success: true, provider: "fast2sms", messageId: json.request_id };
      }
      return { success: false, provider: "fast2sms", error: json.message || "SMS gateway failed" };
    } catch (err: any) {
      return { success: false, provider: "fast2sms", error: err.message };
    }
  }

  // 3. Development Mock Logging Fallback
  console.log(`[SMS MOCK NOTIFICATION] To: ${phone} | OTP: ${otp}`);
  return { success: true, provider: "mock", messageId: `mock_sms_${Date.now()}` };
}

export async function sendOtpEmail(email: string, otp: string): Promise<EmailDeliveryResult> {
  console.log(`[EMAIL MOCK NOTIFICATION] To: ${email} | OTP: ${otp}`);
  return { success: true, provider: "mock", messageId: `mock_email_${Date.now()}` };
}
