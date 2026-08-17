import http from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import { jwtVerify, SignJWT } from "jose";
import { Server } from "socket.io";
import { z } from "zod";
import { prisma } from "./prisma.js";

const app = express();
const server = http.createServer(app);
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()) : ["http://localhost:3000", "http://127.0.0.1:3000"];
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "12mb" }));

const io = new Server(server, { cors: corsOptions });

async function setupRedisAdapter(ioServer: Server) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return;

  try {
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { Redis } = await import("ioredis");

    if (redisUrl.startsWith("redis://") || redisUrl.startsWith("rediss://")) {
      const pubClient = new Redis(redisUrl);
      const subClient = pubClient.duplicate();
      ioServer.adapter(createAdapter(pubClient, subClient));
      console.log("[Socket.io] Redis Adapter attached successfully for multi-instance broadcasting");
    }
  } catch (err: any) {
    console.warn("[Socket.io] Could not attach Redis Adapter, using default in-memory adapter:", err.message);
  }
}

void setupRedisAdapter(io);

function getJwtSecret() {
  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return new TextEncoder().encode("backhaul-local-development-secret-change-me");
  }
  return new TextEncoder().encode(secretStr);
}

// Socket.io JWT Handshake Middleware
io.use(async (socket, next) => {
  try {
    const authHeader = socket.handshake.headers.authorization;
    const token =
      socket.handshake.auth?.token ||
      (authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null);

    if (!token) {
      return next(new Error("Authentication required for WebSocket connection"));
    }

    const { payload } = await jwtVerify(token, getJwtSecret());
    const auth = payload as unknown as { userId: string; role: string; sr?: string; name?: string };
    socket.data.user = {
      userId: auth.userId,
      accountRole: auth.role,
      role: auth.sr || auth.role,
      name: auth.name,
    };
    next();
  } catch (error) {
    next(new Error("Invalid or expired authentication token"));
  }
});

// Socket.io Connection & Room Authorization
io.on("connection", (socket) => {
  const user = socket.data.user;
  if (user?.userId) {
    socket.join(`user:${user.userId}`);
  }

  socket.on("join-room", async ({ room }: { room: string }) => {
    if (!room || typeof room !== "string") return;

    const isAdmin = user?.accountRole === "ADMIN" || user?.role === "ADMIN";

    if (room.startsWith("user:")) {
      const targetUserId = room.replace(/^user:/, "");
      if (isAdmin || targetUserId === user?.userId) {
        socket.join(room);
      }
    } else if (room.startsWith("booking:")) {
      const bookingId = room.replace(/^booking:/, "");
      if (isAdmin) {
        socket.join(room);
        return;
      }
      const passBooking = await prisma.passengerBooking.findUnique({ where: { id: bookingId } });
      if (passBooking && passBooking.passengerId === user?.userId) {
        socket.join(room);
        return;
      }
      const goodsBooking = await prisma.goodsBooking.findUnique({ where: { id: bookingId }, include: { goodsRequest: true } });
      if (goodsBooking && goodsBooking.goodsRequest.senderId === user?.userId) {
        socket.join(room);
        return;
      }
    } else if (room.startsWith("trip:")) {
      const tripId = room.replace(/^trip:/, "");
      if (isAdmin) {
        socket.join(room);
        return;
      }
      const trip = await prisma.returnTrip.findUnique({ where: { id: tripId }, include: { driver: true } });
      if (trip && trip.driver.userId === user?.userId) {
        socket.join(room);
        return;
      }
    }
  });
});

type AuthUser = { userId: string; role: string; sr?: string; name?: string };

const locationSchema = z.object({ name: z.string().min(2), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const loginSchema = z.object({ identifier: z.string().min(1), password: z.string().min(1) });
const sessionRoleSchema = z.object({ role: z.enum(["ROUTEMATE", "LOADMATE", "CAPTAIN", "MERCHANT", "ADMIN"]) });
const availabilitySchema = z.object({ isLookingForPassengers: z.boolean() });
const passengerAvailabilitySchema = z.object({ isLookingForRide: z.boolean() });
const passengerMatchSchema = z.object({ pickup: locationSchema, drop: locationSchema, departureTime: z.string().datetime(), seats: z.number().int().positive(), isLookingForRide: z.boolean().default(true) });
const goodsMatchSchema = z.object({ pickup: locationSchema, drop: locationSchema, departureTime: z.string().datetime().optional(), goodsType: z.string().min(2), weightKg: z.number().positive(), quantity: z.number().int().positive(), sizeDescription: z.string().min(2), isFragile: z.boolean().default(false), requiresColdStorage: z.boolean().default(false), isHeavy: z.boolean().default(false) });
const tripStatusSchema = z.object({ status: z.enum(["ACTIVE", "DRIVING", "PICKUP_REACHED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) });
const gpsSchema = z.object({ tripId: z.string().optional(), lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), status: z.enum(["IDLE", "LOOKING", "DRIVING", "OFFLINE"]).default("DRIVING") });
const internalEmitSchema = z.object({ event: z.string().min(1), room: z.string().min(1), payload: z.record(z.unknown()).default({}) });

type LocationPoint = { lat: number; lng: number };

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(a: LocationPoint, b: LocationPoint) {
  const radiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * radiusKm * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pointToRoute(point: LocationPoint, from: LocationPoint, to: LocationPoint) {
  const scale = Math.cos(toRad((from.lat + to.lat) / 2));
  const x1 = from.lng * scale;
  const y1 = from.lat;
  const x2 = to.lng * scale;
  const y2 = to.lat;
  const xp = point.lng * scale;
  const yp = point.lat;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy || 1;
  const progress = Math.max(0, Math.min(1, ((xp - x1) * dx + (yp - y1) * dy) / lengthSq));
  const projected = { lat: y1 + progress * dy, lng: (x1 + progress * dx) / scale };
  return { distanceKm: haversineKm(point, projected), progress };
}

function routeFit(trip: any, pickup: LocationPoint, drop: LocationPoint) {
  const from = { lat: trip.fromLat, lng: trip.fromLng };
  const to = { lat: trip.toLat, lng: trip.toLng };
  const pickupProjection = pointToRoute(pickup, from, to);
  const dropProjection = pointToRoute(drop, from, to);
  return { detourKm: pickupProjection.distanceKm + dropProjection.distanceKm, ordered: dropProjection.progress > pickupProjection.progress };
}

function parseAllowedGoods(raw: unknown) {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function ok(response: express.Response, data: Record<string, unknown>, message = "Action completed successfully", status = 200) {
  return response.status(status).json({ success: true, message, data, ...data });
}

function fail(response: express.Response, message: string, status = 400, errors: unknown[] = []) {
  return response.status(status).json({ success: false, message, error: message, errors });
}

function routeRoom(from: string, to: string) {
  return `route:${from}-${to}`;
}

function getBearer(request: express.Request) {
  const header = request.header("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function signToken(input: AuthUser) {
  return new SignJWT(input).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(jwtSecret);
}

async function readAuth(request: express.Request): Promise<AuthUser | null> {
  const token = getBearer(request);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwtSecret);
    return payload as AuthUser;
  } catch {
    return null;
  }
}

function parseRoles(raw: unknown, fallback: string) {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }
  return [fallback];
}

io.on("connection", (socket) => {
  socket.on("route:join", ({ from, to }: { from: string; to: string }) => {
    socket.join(routeRoom(from, to));
  });
  socket.on("driver:join", ({ driverId }: { driverId: string }) => {
    socket.join(`driver:${driverId}`);
  });
});

app.get("/health", (_request, response) => ok(response, { status: "ok" }, "Backhaul API healthy"));

app.post("/auth/login", async (request, response) => {
  const parsed = loginSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Email, phone, or username and password are required", 400, parsed.error.issues);
  const identifier = parsed.data.identifier.trim();
  const phone = identifier.replace(/\D/g, "");
  const user = await prisma.user.findFirst({ where: { OR: [{ email: identifier.toLowerCase() }, { username: identifier }, ...(phone ? [{ phone }] : [])] } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return fail(response, "Invalid credentials", 401);
  if (!user.otpVerified) return fail(response, "Verify your OTP first", 403);
  const availableRoles = parseRoles(user.roles, user.role);
  const sessionRole = user.role === "ADMIN" ? "ADMIN" : undefined;
  const token = await signToken({ userId: user.id, role: user.role, sr: sessionRole, name: user.fullName });
  return ok(response, { token, user: { id: user.id, name: user.fullName, role: user.role, sessionRole, availableRoles }, requiresRoleSelection: !sessionRole }, "Login successful");
});

app.get("/auth/me", async (request, response) => {
  const auth = await readAuth(request);
  if (!auth) return fail(response, "Login required", 401);
  const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, fullName: true, email: true, role: true, roles: true, language: true } });
  if (!user) return fail(response, "Login required", 401);
  return ok(response, { user: { ...user, role: auth.sr || user.role, accountRole: user.role, sessionRole: auth.sr, availableRoles: parseRoles(user.roles, user.role) } });
});

app.post("/auth/session-role", async (request, response) => {
  const auth = await readAuth(request);
  if (!auth) return fail(response, "Login required", 401);
  const parsed = sessionRoleSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Choose a valid Backhaul role", 400, parsed.error.issues);
  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return fail(response, "Login required", 401);
  const availableRoles = parseRoles(user.roles, user.role);
  if (!availableRoles.includes(parsed.data.role)) return fail(response, "This account cannot use that role", 403);
  const token = await signToken({ userId: user.id, role: user.role, sr: parsed.data.role, name: user.fullName });
  return ok(response, { token, sessionRole: parsed.data.role, availableRoles }, "Session role selected");
});

app.post("/internal/realtime/emit", (request, response) => {
  const secret = request.header("x-internal-secret") || "";
  if (secret !== (process.env.REALTIME_INTERNAL_SECRET || "backhaul-local-dev")) return fail(response, "Forbidden", 403);
  const parsed = internalEmitSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Invalid realtime event", 400, parsed.error.issues);
  io.to(parsed.data.room).emit(parsed.data.event, parsed.data.payload);
  return ok(response, { emitted: true }, "Realtime event emitted");
});

app.patch("/trip/:id/availability", async (request, response) => {
  const parsed = availabilitySchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "isLookingForPassengers must be boolean", 400, parsed.error.issues);
  const trip = await prisma.returnTrip.update({ where: { id: request.params.id }, data: parsed.data });
  const room = routeRoom(trip.fromLocationName, trip.toLocationName);
  const payload = { type: "trip", tripId: trip.id, isLookingForPassengers: trip.isLookingForPassengers, from: trip.fromLocationName, to: trip.toLocationName };
  io.to(room).emit("availability:update", payload);
  return ok(response, { trip, event: { name: "availability:update", room, payload } }, "Captain availability updated");
});

app.patch("/passenger/:id/availability", async (request, response) => {
  const parsed = passengerAvailabilitySchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "isLookingForRide must be boolean", 400, parsed.error.issues);
  const booking = await prisma.passengerBooking.update({ where: { id: request.params.id }, data: parsed.data });
  const room = routeRoom(booking.pickupName, booking.dropName);
  const payload = { type: "passenger", passengerBookingId: booking.id, isLookingForRide: booking.isLookingForRide, from: booking.pickupName, to: booking.dropName };
  io.to(room).emit("availability:update", payload);
  return ok(response, { booking, event: { name: "availability:update", room, payload } }, "Passenger availability updated");
});

app.patch("/trip/:id/status", async (request, response) => {
  const parsed = tripStatusSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Choose a valid trip status", 400, parsed.error.issues);
  const trip = await prisma.returnTrip.update({ where: { id: request.params.id }, data: { status: parsed.data.status } });
  await prisma.tripEvent.create({ data: { tripId: trip.id, type: "STATUS_CHANGE", status: trip.status } });
  const room = routeRoom(trip.fromLocationName, trip.toLocationName);
  const payload = { tripId: trip.id, status: trip.status, from: trip.fromLocationName, to: trip.toLocationName };
  io.to(room).emit("trip:status", payload);
  return ok(response, { trip, event: { name: "trip:status", room, payload } }, "Trip status updated");
});

app.post("/driver/location", async (request, response) => {
  const auth = await readAuth(request);
  if (!auth || (auth.sr || auth.role) !== "CAPTAIN") return fail(response, "Backhaul Captain access required", 403);
  const parsed = gpsSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Invalid driver location", 400, parsed.error.issues);
  const driver = await prisma.driverProfile.findUnique({ where: { userId: auth.userId } });
  if (!driver) return fail(response, "Driver profile missing", 404);
  const trip = parsed.data.tripId ? await prisma.returnTrip.findFirst({ where: { id: parsed.data.tripId, driverId: driver.id } }) : null;
  const location = await prisma.driverLocation.create({ data: { driverId: driver.id, tripId: trip?.id, lat: parsed.data.lat, lng: parsed.data.lng, status: parsed.data.status } });
  const room = trip ? routeRoom(trip.fromLocationName, trip.toLocationName) : `driver:${driver.id}`;
  const payload = { driverId: driver.id, tripId: trip?.id, lat: location.lat, lng: location.lng, status: location.status, createdAt: location.createdAt };
  io.to(room).emit("driver:gps", payload);
  return ok(response, { location, event: { name: "driver:gps", room, payload } }, "Driver location updated", 201);
});

app.post("/match/passenger", async (request, response) => {
  const parsed = passengerMatchSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Invalid passenger match search", 400, parsed.error.issues);
  if (!parsed.data.isLookingForRide) return ok(response, { matches: [] }, "Passenger search is paused");
  const selected = new Date(parsed.data.departureTime);
  const candidates = await prisma.returnTrip.findMany({
    where: {
      status: "ACTIVE",
      isLookingForPassengers: true,
      availableSeats: { gte: parsed.data.seats },
      departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 36 * 3600000) },
      driver: { is: { verificationStatus: "APPROVED" } },
      vehicle: { is: { verificationStatus: "APPROVED", permitType: { in: ["PASSENGER", "BOTH"] } } },
    },
    include: { vehicle: true, driver: { include: { user: true } } },
    take: 50,
  });
  const matches = candidates.filter((trip: any) => {
    const fit = routeFit(trip, parsed.data.pickup, parsed.data.drop);
    return fit.ordered && fit.detourKm <= trip.maxDetourKm;
  });
  return ok(response, { matches }, "Passenger matches loaded");
});

app.post("/match/goods", async (request, response) => {
  const parsed = goodsMatchSchema.safeParse(request.body);
  if (!parsed.success) return fail(response, "Invalid goods match search", 400, parsed.error.issues);
  const selected = parsed.data.departureTime ? new Date(parsed.data.departureTime) : new Date();
  const candidates = await prisma.returnTrip.findMany({
    where: {
      status: "ACTIVE",
      isLookingForGoods: true,
      availableGoodsCapacityKg: { gte: parsed.data.weightKg },
      departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 7 * 86400000) },
      driver: { is: { verificationStatus: "APPROVED" } },
      vehicle: { is: { verificationStatus: "APPROVED", permitType: { in: ["GOODS", "BOTH"] } } },
    },
    include: { vehicle: true, driver: { include: { user: true } } },
    take: 50,
  });
  const matches = candidates.filter((trip: any) => {
    const fit = routeFit(trip, parsed.data.pickup, parsed.data.drop);
    const allowedGoods = parseAllowedGoods(trip.allowedGoodsTypes);
    const goodsTypeAllowed = allowedGoods.length === 0 || allowedGoods.includes(parsed.data.goodsType);
    const coldStorageAllowed = !parsed.data.requiresColdStorage || String(trip.vehicle?.vehicleType || "").includes("REFRIGERATED");
    return fit.ordered && fit.detourKm <= trip.maxDetourKm && goodsTypeAllowed && coldStorageAllowed;
  });
  return ok(response, { matches }, "Goods matches loaded");
});

app.post("/uploads", async (request, response) => {
  const parsed = z.object({ kind: z.enum(["goods", "document", "proof", "profile"]), fileName: z.string().min(1), contentType: z.string().min(1), base64: z.string().min(1) }).safeParse(request.body);
  if (!parsed.success) return fail(response, "Invalid upload body", 400, parsed.error.issues);
  const key = `${parsed.data.kind}/${Date.now()}-${parsed.data.fileName.replace(/[^a-zA-Z0-9. -]/g, "")}`;
  const buffer = Buffer.from(parsed.data.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
  if (!buffer.length || buffer.length > 5_000_000) return fail(response, "Choose a file up to 5 MB", 400);
  const publicBase = process.env.PUBLIC_UPLOAD_BASE_URL || "/uploads";
  if ((process.env.UPLOAD_DRIVER || "local") === "local") {
    const uploadRoot = process.env.UPLOAD_DIR || path.join("public", "uploads");
    const absoluteRoot = path.isAbsolute(uploadRoot) ? uploadRoot : path.join(process.cwd(), "..", "..", uploadRoot);
    const absolutePath = path.join(absoluteRoot, key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
  }
  return ok(response, { upload: { key, url: `${publicBase.replace(/\/$/, "")}/${key}`, contentType: parsed.data.contentType } }, "File uploaded", 201);
});

server.listen(Number(process.env.PORT || 4000), () => {
  console.log(`Backhaul API listening on http://localhost:${process.env.PORT || 4000}`);
});
