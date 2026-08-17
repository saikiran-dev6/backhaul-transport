# Backhaul Production Deployment Guide

## 1. Prerequisites & Environment Setup
Ensure the target deployment server has Node.js 18+ LTS, PostgreSQL 15+, and Redis 6+ provisioned.

### Required Production Environment Variables
- `DATABASE_URL`: PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname?schema=public`).
- `JWT_SECRET`: High-entropy secret key (minimum 32 random characters).
- `NODE_ENV`: Must be explicitly set to `"production"`.
- `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN`: Upstash REST API credentials for cloud distributed rate limiting.
- `REDIS_URL`: Native TCP Redis connection URL (optional alternative to Upstash REST).
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`: Production Razorpay gateway credentials.

## 2. Deployment Execution Workflow
Execute the following deployment commands on the production host:
```bash
# 1. Install production dependencies
pnpm install --frozen-lockfile

# 2. Validate Prisma schema & apply database migrations
pnpm exec prisma validate
pnpm exec prisma migrate deploy

# 3. Build optimized production bundle
pnpm build

# 4. Start Next.js production server
pnpm start
```

## 3. Reverse Proxy & Security Header Configuration
- Configure Nginx / Cloudflare as a reverse proxy terminated with SSL/TLS (HTTPS).
- Enforce WebSockets support for Socket.io (`Upgrade` & `Connection` headers).
- Restrict allowed HTTP origins in `CORS_ORIGIN`.

## 4. Operational Health Verification
After deployment, test public health and readiness endpoints:
- `GET https://your-domain.com/api/health` -> Expect `HTTP 200 OK { status: "ok" }`.
- `GET https://your-domain.com/api/ready` -> Expect `HTTP 200 OK { status: "ready", components: { database: "ok", redis: "configured", razorpay: "configured" } }`.
