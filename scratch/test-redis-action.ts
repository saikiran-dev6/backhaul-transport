import { checkRateLimit } from "../lib/rateLimit";
import { getAppConfig } from "../lib/config";

async function runRedisStoreTest() {
  console.log("=== BACKHAUL REDIS STORE ACTION & PIPELINE VERIFICATION ===");
  
  const cfg = getAppConfig();
  console.log("Configuration check:");
  console.log("- Node Env:", cfg.nodeEnv);
  console.log("- Redis URL configured:", Boolean(cfg.redisUrl));
  console.log("- Upstash REST URL configured:", Boolean(cfg.upstashRedisRestUrl));

  const testKey = `test_user_ip_${Date.now()}`;
  const limit = 3;
  const windowMs = 60000;

  console.log("\nTesting Rate Limit Action with Limit = 3:");

  for (let i = 1; i <= 5; i++) {
    const res = await checkRateLimit(testKey, limit, windowMs);
    console.log(`Request #${i} -> Allowed: ${res.allowed}, RetryAfter: ${res.retryAfterSeconds}s`);
  }
}

runRedisStoreTest().catch(console.error);
