import { describe, expect, it } from "vitest";
import { sendPushNotification } from "@/lib/push";

describe("Mobile Push Notification Service (Expo / FCM)", () => {
  it("dispatches push notification in development mock mode", async () => {
    const res = await sendPushNotification({
      pushToken: "ExponentPushToken[mock_token_12345]",
      title: "Captain Arriving",
      body: "Your RouteMate Captain is 2 minutes away.",
      data: { bookingId: "b_100" },
    });

    expect(res.success).toBe(true);
    expect(res.tickets).toBeDefined();
    expect(res.tickets?.length).toBe(1);
  });

  it("handles batch push notification tokens cleanly", async () => {
    const res = await sendPushNotification({
      pushToken: ["ExponentPushToken[token_1]", "ExponentPushToken[token_2]"],
      title: "Trip Status Updated",
      body: "Trip status is now IN_PROGRESS.",
    });

    expect(res.success).toBe(true);
    expect(res.tickets?.length).toBe(2);
  });
});
