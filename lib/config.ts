export type AppConfig = {
  databaseUrl: string;
  jwtSecret: string;
  redisUrl: string | null;
  upstashRedisRestUrl: string | null;
  upstashRedisRestToken: string | null;
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  razorpayWebhookSecret: string | null;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  smsGatewayApiKey: string | null;
  smsSenderId: string | null;
  mapboxAccessToken: string | null;
  googleMapsApiKey: string | null;
  nodeEnv: string;
};

export function getAppConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL || "postgresql://backhaul:backhaul@localhost:5433/backhaul";
  const jwtSecret = process.env.JWT_SECRET || "backhaul-local-development-secret-change-me";
  const redisUrl = process.env.REDIS_URL || null;
  const upstashRedisRestUrl = process.env.UPSTASH_REDIS_REST_URL || null;
  const upstashRedisRestToken = process.env.UPSTASH_REDIS_REST_TOKEN || null;
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || null;
  const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || null;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || null;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || null;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || null;
  const smsGatewayApiKey = process.env.SMS_GATEWAY_API_KEY || null;
  const smsSenderId = process.env.SMS_SENDER_ID || null;
  const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || null;
  const nodeEnv = process.env.NODE_ENV || "development";

  if (nodeEnv === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is strictly required in production");
  }

  return {
    databaseUrl,
    jwtSecret,
    redisUrl,
    upstashRedisRestUrl,
    upstashRedisRestToken,
    razorpayKeyId,
    razorpayKeySecret,
    razorpayWebhookSecret,
    twilioAccountSid,
    twilioAuthToken,
    twilioPhoneNumber,
    smsGatewayApiKey,
    smsSenderId,
    mapboxAccessToken,
    googleMapsApiKey,
    nodeEnv,
  };
}

export function isRedisConfigured(): boolean {
  const cfg = getAppConfig();
  return Boolean(cfg.redisUrl || (cfg.upstashRedisRestUrl && cfg.upstashRedisRestToken));
}

export function isRazorpayConfigured(): boolean {
  const cfg = getAppConfig();
  return Boolean(cfg.razorpayKeyId && cfg.razorpayKeySecret);
}

export function isSmsGatewayConfigured(): boolean {
  const cfg = getAppConfig();
  return Boolean((cfg.twilioAccountSid && cfg.twilioAuthToken) || cfg.smsGatewayApiKey);
}

export function getPublicConfigStatus() {
  const cfg = getAppConfig();
  return {
    nodeEnv: cfg.nodeEnv,
    database: "configured",
    redis: isRedisConfigured() ? "configured" : "not_configured",
    razorpay: isRazorpayConfigured() ? "configured" : "not_configured",
    smsGateway: isSmsGatewayConfigured() ? "configured" : "not_configured",
  };
}
