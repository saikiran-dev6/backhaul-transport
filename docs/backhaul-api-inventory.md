# BACKHAUL — API ROUTE INVENTORY & AUDIT

**Project:** `C:\Users\SUSHMA SHYAMALA\OneDrive\Tài liệu\transport 2`  
**Audit Date:** August 18, 2026  
**Status:** `AUDITED — COMPLETE INVENTORY`  

---

## Executive Summary

This document provides a comprehensive inventory of all REST API routes implemented in the Backhaul application. Every endpoint is audited for authentication, authorization (RBAC), resource ownership (IDOR protection), state mutation safeguards, rate limiting, and transaction boundaries.

---

## API Endpoint Matrix

| Method | Endpoint Path | Auth Required | Session Role Required | IDOR Protection | Rate Limited | Transactional | Audit Logged |
| :--- | :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| `POST` | `/api/auth/register` | Public | None | N/A | Yes | Yes | Yes |
| `POST` | `/api/auth/login` | Public | None | N/A | Yes | Yes | Yes |
| `POST` | `/api/auth/verify-otp` | Public | None | N/A | Yes | Yes | Yes |
| `GET` | `/api/auth/me` | User | None | N/A | No | No | No |
| `POST` | `/api/auth/logout` | User | None | N/A | No | Yes | Yes |
| `POST` | `/api/auth/refresh` | Public / Cookie | None | N/A | Yes | Yes | Yes |
| `POST` | `/api/auth/session-role` | User | Dynamic Role | N/A | No | No | Yes |
| `GET` | `/api/matches/passenger` | User | `passenger` | N/A | Yes | No | No |
| `GET` | `/api/matches/goods` | User | `goods` | N/A | Yes | No | No |
| `POST` | `/api/bookings/passenger` | User | `passenger` | Passenger Match | Yes | Yes | Yes |
| `POST` | `/api/bookings/goods` | User | `goods` | Sender Match | Yes | Yes | Yes |
| `POST` | `/api/bookings/passenger/verify-otp` | User | `driver` | Assigned Driver | Yes | Yes | Yes |
| `POST` | `/api/bookings/goods/verify-pickup-otp` | User | `driver` | Assigned Driver | Yes | Yes | Yes |
| `POST` | `/api/bookings/goods/verify-delivery-otp` | User | `driver` | Assigned Driver | Yes | Yes | Yes |
| `POST` | `/api/bookings/passenger/complete` | User | `driver` | Assigned Driver | Yes | Yes | Yes |
| `POST` | `/api/bookings/goods/complete` | User | `driver` | Assigned Driver | Yes | Yes | Yes |
| `POST` | `/api/payments/create-order` | User | Passenger / Sender | Resource Owner | Yes | Yes | Yes |
| `POST` | `/api/payments/verify` | User | Passenger / Sender | Resource Owner | Yes | Yes | Yes |
| `POST` | `/api/payments/confirm-cash` | User | `driver` | Assigned Driver | Yes | Yes | Yes |
| `POST` | `/api/payments/refund` | User | `admin` | Admin Guard | Yes | Yes | Yes |
| `POST` | `/api/payments/webhook` | Public (Signature) | Webhook HMAC | Signature Verified | Yes | Yes | Yes |
| `GET` | `/api/health` | Public | None | N/A | No | No | No |
| `GET` | `/api/ready` | Public | None | N/A | No | DB Query | No |
| `GET` | `/api/admin/metrics` | User | `admin` | Admin Guard | No | No | No |

---

## Detailed Endpoint Specifications

### Authentication Routes (`/api/auth/*`)
- **`POST /api/auth/register`**: Validates registration payload (Zod). Password hashed via `bcryptjs`. Creates `User` record and generates SMS/Email mock OTP (`123456`).
- **`POST /api/auth/login`**: Authenticates user credentials. Generates HTTP-only `JWT` containing `userId`, `accountRole`, and `sr` (session role). Issues refresh token to `AuthSession` table.
- **`POST /api/auth/verify-otp`**: Validates code against `otpHash` using timing-safe comparison. Updates user `status = ACTIVE`.

### Matching & Booking Routes (`/api/matches/*`, `/api/bookings/*`)
- **`GET /api/matches/passenger`**: Executes PostGIS geospatial projection query on `ReturnTrip` table. Filters active trips matching origin/destination radius, detour constraints, and seat availability.
- **`POST /api/bookings/passenger`**: Creates `PassengerBooking` in `PENDING` state. **No payment captured at booking time.**

### Payment Routes (`/api/payments/*`)
- **`POST /api/payments/create-order`**: Validates that `bookingStatus = COMPLETED` (or `deliveryStatus = COMPLETED`). Rejects pre-completion requests with `400 Bad Request`.
- **`POST /api/payments/confirm-cash`**: Restricted exclusively to assigned `driverId`. Idempotently updates booking `paymentStatus = PAID` and transitions payment state to `CAPTURED`.

---

## Security Audit Summary

1. **IDOR Safeguards:** All mutations check `booking.passengerId === auth.userId`, `booking.goodsRequest.senderId === auth.userId`, or `trip.driverId === auth.userId`.
2. **Payment Timing Enforcement:** Strict rule enforced: **Zero payment at booking creation.**
3. **No Unprotected Endpoints:** All sensitive business endpoints enforce JWT validation via `requestUser()` and Next.js middleware.
