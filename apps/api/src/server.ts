import http from "node:http";
import cors from "cors";
import express from "express";
import { Server } from "socket.io";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || "*" } });

app.use(cors());
app.use(express.json());

const availabilitySchema = z.object({ isLookingForPassengers: z.boolean() });
const passengerAvailabilitySchema = z.object({ isLookingForRide: z.boolean() });

function routeRoom(from: string, to: string) {
  return `route:${from}-${to}`;
}

io.on("connection", (socket) => {
  socket.on("route:join", ({ from, to }: { from: string; to: string }) => {
    socket.join(routeRoom(from, to));
  });
});

app.patch("/trip/:id/availability", async (request, response) => {
  const parsed = availabilitySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "isLookingForPassengers must be boolean" });

  const trip = await prisma.returnTrip.update({ where: { id: request.params.id }, data: parsed.data });
  const room = routeRoom(trip.fromLocationName, trip.toLocationName);
  const payload = { type: "trip", tripId: trip.id, isLookingForPassengers: trip.isLookingForPassengers, from: trip.fromLocationName, to: trip.toLocationName };
  io.to(room).emit("availability:update", payload);
  response.json({ trip, event: { name: "availability:update", room, payload } });
});

app.patch("/passenger/:id/availability", async (request, response) => {
  const parsed = passengerAvailabilitySchema.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ error: "isLookingForRide must be boolean" });

  const booking = await prisma.passengerBooking.update({ where: { id: request.params.id }, data: parsed.data });
  const room = routeRoom(booking.pickupName, booking.dropName);
  const payload = { type: "passenger", passengerBookingId: booking.id, isLookingForRide: booking.isLookingForRide, from: booking.pickupName, to: booking.dropName };
  io.to(room).emit("availability:update", payload);
  response.json({ booking, event: { name: "availability:update", room, payload } });
});

app.post("/match/passenger", async (request, response) => {
  const body = z.object({
    from: z.string(),
    to: z.string(),
    departureTime: z.string().datetime(),
    seats: z.number().int().positive(),
    passengerRequestId: z.string().optional(),
  }).parse(request.body);

  const passengerReq = body.passengerRequestId ? await prisma.passengerBooking.findUnique({ where: { id: body.passengerRequestId } }) : null;
  if (passengerReq && !passengerReq.isLookingForRide) return response.json({ matches: [] });

  const selected = new Date(body.departureTime);
  const matches = await prisma.returnTrip.findMany({
    where: {
      status: "ACTIVE",
      isLookingForPassengers: true,
      availableSeats: { gte: body.seats },
      departureTime: { gte: new Date(selected.getTime() - 12 * 3600000), lte: new Date(selected.getTime() + 36 * 3600000) },
    },
    include: { driver: { include: { user: true } } },
    take: 50,
  });
  response.json({ matches });
});

server.listen(Number(process.env.PORT || 4000), () => {
  console.log(`Backhaul API listening on http://localhost:${process.env.PORT || 4000}`);
});
