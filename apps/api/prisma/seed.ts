import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const HYDERABAD = { name: "Hyderabad, Telangana", lat: 17.385, lng: 78.4867 };
const SRISAILAM = { name: "Srisailam, Andhra Pradesh", lat: 16.0728, lng: 78.8686 };
const LB_NAGAR = { name: "LB Nagar, Hyderabad", lat: 17.3457, lng: 78.5522 };

async function setTripGeo(tripId: string) {
  await prisma.$executeRaw`
    UPDATE "ReturnTrip"
    SET
      "fromGeo" = ST_SetSRID(ST_MakePoint(${HYDERABAD.lng}, ${HYDERABAD.lat}), 4326)::geography,
      "toGeo" = ST_SetSRID(ST_MakePoint(${SRISAILAM.lng}, ${SRISAILAM.lat}), 4326)::geography
    WHERE "id" = ${tripId}
  `;
}

async function setPassengerBookingGeo(bookingId: string) {
  await prisma.$executeRaw`
    UPDATE "PassengerBooking"
    SET
      "pickupGeo" = ST_SetSRID(ST_MakePoint(${LB_NAGAR.lng}, ${LB_NAGAR.lat}), 4326)::geography,
      "dropGeo" = ST_SetSRID(ST_MakePoint(${SRISAILAM.lng}, ${SRISAILAM.lat}), 4326)::geography
    WHERE "id" = ${bookingId}
  `;
}

async function main() {
  await prisma.passengerBooking.deleteMany();
  await prisma.returnTrip.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.user.deleteMany();

  const captainUser = await prisma.user.create({
    data: {
      fullName: "Arjun Reddy",
      username: "captain_arjun",
      phone: "9876500004",
      email: "driver@backhaul.test",
      passwordHash: "Demo@123-local-seed-placeholder",
      role: Role.CAPTAIN,
      roles: [Role.CAPTAIN],
    },
  });

  const passenger = await prisma.user.create({
    data: {
      fullName: "Meera RouteMate",
      username: "meera_route",
      phone: "9876500001",
      email: "passenger@backhaul.test",
      passwordHash: "Demo@123-local-seed-placeholder",
      role: Role.ROUTEMATE,
      roles: [Role.ROUTEMATE],
    },
  });

  const captain = await prisma.driverProfile.create({
    data: {
      userId: captainUser.id,
      verificationStatus: "APPROVED",
      rating: 4.9,
    },
  });

  const departureTime = new Date();
  departureTime.setDate(departureTime.getDate() + 1);
  departureTime.setHours(8, 30, 0, 0);

  const trip = await prisma.returnTrip.create({
    data: {
      driverId: captain.id,
      fromLocationName: HYDERABAD.name,
      fromLat: HYDERABAD.lat,
      fromLng: HYDERABAD.lng,
      toLocationName: SRISAILAM.name,
      toLat: SRISAILAM.lat,
      toLng: SRISAILAM.lng,
      departureTime,
      availableSeats: 3,
      availableGoodsCapacityKg: 0,
      maxDetourKm: 12,
      isLookingForPassengers: true,
      status: "ACTIVE",
    },
  });

  const booking = await prisma.passengerBooking.create({
    data: {
      tripId: trip.id,
      passengerId: passenger.id,
      pickupName: LB_NAGAR.name,
      pickupLat: LB_NAGAR.lat,
      pickupLng: LB_NAGAR.lng,
      dropName: SRISAILAM.name,
      dropLat: SRISAILAM.lat,
      dropLng: SRISAILAM.lng,
      seatsBooked: 1,
      fare: 489,
      isLookingForRide: true,
      bookingStatus: "REQUESTED",
    },
  });

  await setTripGeo(trip.id);
  await setPassengerBookingGeo(booking.id);

  console.log("Seeded PostgreSQL Backhaul API demo data.");
  console.log("Captain:", captainUser.email);
  console.log("Passenger:", passenger.email);
  console.log("Route:", `${HYDERABAD.name} -> ${SRISAILAM.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
