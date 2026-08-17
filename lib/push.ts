export type PushPayload = {
  pushToken: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
};

export type PushDeliveryResult = {
  success: boolean;
  provider: "expo" | "mock";
  tickets?: Array<{ status: string; id?: string; message?: string }>;
  error?: string;
};

export async function sendPushNotification(payload: PushPayload): Promise<PushDeliveryResult> {
  const tokens = Array.isArray(payload.pushToken) ? payload.pushToken : [payload.pushToken];
  const validExpoTokens = tokens.filter((t) => typeof t === "string" && (t.startsWith("ExponentPushToken[") || t.startsWith("ExpoPushToken[")));

  if (validExpoTokens.length > 0) {
    try {
      const messages = validExpoTokens.map((token) => ({
        to: token,
        sound: payload.sound ?? "default",
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        priority: payload.priority ?? "high",
      }));

      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });

      const json = await res.json();
      if (res.ok && json.data) {
        return { success: true, provider: "expo", tickets: json.data };
      }
      return { success: false, provider: "expo", error: json.errors?.[0]?.message || "Expo Push delivery failed" };
    } catch (err: any) {
      return { success: false, provider: "expo", error: err.message };
    }
  }

  // Development Mock Logging Fallback
  console.log(`[PUSH MOCK NOTIFICATION] Tokens (${tokens.length}) | Title: "${payload.title}" | Body: "${payload.body}"`);
  return {
    success: true,
    provider: "mock",
    tickets: tokens.map((t) => ({ status: "ok", id: `mock_ticket_${t.slice(0, 8)}_${Date.now()}` })),
  };
}
