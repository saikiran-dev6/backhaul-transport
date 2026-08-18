# BACKHAUL — SECURITY & ACCESS CONTROL VERIFICATION

**Project:** `C:\Users\SUSHMA SHYAMALA\OneDrive\Tài liệu\transport 2`  
**Audit Date:** August 18, 2026  
**Status:** `AUDITED — PASS WITH 0 HIGH VULNERABILITIES`  

---

## Executive Summary

This document presents the security evaluation of the Backhaul application across authentication mechanics, authorization guards, IDOR protection, payment timing, rate limiting, and secret management.

---

## Security Audit Vector Matrix

| Audit Vector | Risk Level | Protection Mechanism | Verification Verdict |
| :--- | :---: | :--- | :---: |
| **IDOR Resource Access** | Critical | Strict user ID cross-checks against DB records (`passengerId`, `senderId`, `driverId`) | `PASS` |
| **Payment Pre-Completion Tampering** | Critical | Middleware & API route verification rejecting payment creation prior to ride completion | `PASS` |
| **Price / Fare Manipulation** | High | Server-side price calculation directly from PostgreSQL fare records; client amounts ignored | `PASS` |
| **Session Role Escalation** | High | Session role (`sr`) checked against user's actual database `accountRole` privileges | `PASS` |
| **JWT Cookie Security** | High | Issued with `HttpOnly`, `SameSite=Lax`, and `Secure` (in production `NODE_ENV`) | `PASS` |
| **Razorpay Webhook Replay** | High | Database `provider_eventId` uniqueness constraint on `PaymentWebhookEvent` table | `PASS` |
| **Timing Attacks on Signatures** | Medium | HMAC comparison uses `crypto.timingSafeEqual` | `PASS` |
| **Rate-Limit Bypass** | Medium | IP & User-based bucket tracking via Redis/Memory store (`lib/rateLimit.ts`) | `PASS` |
| **Hardcoded Secret Audit** | Critical | Zero production secrets found in code repositories; loaded exclusively from `.env` | `PASS` |
| **HTTP Security Headers** | Medium | Enforced via `middleware.ts` (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) | `PASS` |

---

## IDOR Attack Simulation Scenarios

### Scenario A: Passenger Attempting to View/Pay Another Passenger's Booking
- **Action:** User A submits `POST /api/payments/create-order` with User B's `bookingId`.
- **Server Response:** `HTTP 403 Forbidden` (`Unauthorized booking access`).
- **Verdict:** `PASS`

### Scenario B: Driver Attempting to Confirm Cash for Unassigned Trip
- **Action:** Driver A submits `POST /api/payments/confirm-cash` for a trip assigned to Driver B.
- **Server Response:** `HTTP 403 Forbidden` (`Only the assigned driver can confirm cash payment`).
- **Verdict:** `PASS`

### Scenario C: Non-Admin Accessing Admin Metrics Endpoint
- **Action:** Standard passenger user fetches `GET /api/admin/metrics`.
- **Server Response:** `HTTP 403 Forbidden` (`Admin role required`).
- **Verdict:** `PASS`
