import crypto from "crypto";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_mock_key_id";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "mock_razorpay_key_secret_for_local_dev";
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_razorpay_webhook_secret_for_local_dev";
  const isMock = !process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret, webhookSecret, isMock };
}

export async function createRazorpayOrder(options: { amount: number; currency?: string; receipt: string }) {
  const config = getRazorpayConfig();
  const currency = options.currency || "INR";
  const amountInPaise = Math.round(options.amount * 100);

  if (!config.isMock) {
    const authHeader = "Basic " + Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: options.receipt,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Razorpay order creation failed: ${response.status} ${errText}`);
    }
    const data = await response.json();
    return {
      id: data.id as string,
      amount: data.amount as number,
      currency: data.currency as string,
      receipt: data.receipt as string,
    };
  }

  // Local Sandbox / Test Fallback
  const mockId = `order_${crypto.createHash("sha256").update(options.receipt).digest("hex").slice(0, 14)}`;
  return {
    id: mockId,
    amount: amountInPaise,
    currency,
    receipt: options.receipt,
  };
}

export function verifyRazorpayPaymentSignature(options: { orderId: string; paymentId: string; signature: string }): boolean {
  const config = getRazorpayConfig();
  const body = `${options.orderId}|${options.paymentId}`;
  const expectedSignature = crypto.createHmac("sha256", config.keySecret).update(body).digest("hex");
  const b1 = Buffer.from(expectedSignature);
  const b2 = Buffer.from(options.signature);
  if (b1.length !== b2.length) return false;
  return crypto.timingSafeEqual(b1, b2);
}

export function generateRazorpayPaymentSignature(orderId: string, paymentId: string): string {
  const config = getRazorpayConfig();
  const body = `${orderId}|${paymentId}`;
  return crypto.createHmac("sha256", config.keySecret).update(body).digest("hex");
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const config = getRazorpayConfig();
  const expectedSignature = crypto.createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");
  const b1 = Buffer.from(expectedSignature);
  const b2 = Buffer.from(signature);
  if (b1.length !== b2.length) return false;
  return crypto.timingSafeEqual(b1, b2);
}

export function getCaptainSettlementInfo(driver?: { captainPaymentAccountId?: string | null } | null) {
  if (!driver?.captainPaymentAccountId) {
    return { isConfigured: false, accountId: null };
  }
  return { isConfigured: true, accountId: driver.captainPaymentAccountId };
}

export function generateRazorpayWebhookSignature(rawBody: string): string {
  const config = getRazorpayConfig();
  return crypto.createHmac("sha256", config.webhookSecret).update(rawBody).digest("hex");
}
