import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const mode = process.argv[2] || "all";

const extensionStatements = [
  "CREATE EXTENSION IF NOT EXISTS postgis",
];

const indexStatements = [
  'CREATE INDEX IF NOT EXISTS return_trip_from_geo_gix ON "ReturnTrip" USING GIST ("fromGeo")',
  'CREATE INDEX IF NOT EXISTS return_trip_to_geo_gix ON "ReturnTrip" USING GIST ("toGeo")',
  'CREATE INDEX IF NOT EXISTS return_trip_passenger_availability_idx ON "ReturnTrip" ("status", "departureTime", "isLookingForPassengers")',
  'CREATE INDEX IF NOT EXISTS return_trip_goods_availability_idx ON "ReturnTrip" ("status", "departureTime", "isLookingForGoods")',
  'CREATE INDEX IF NOT EXISTS passenger_booking_pickup_geo_gix ON "PassengerBooking" USING GIST ("pickupGeo")',
  'CREATE INDEX IF NOT EXISTS passenger_booking_drop_geo_gix ON "PassengerBooking" USING GIST ("dropGeo")',
  'CREATE INDEX IF NOT EXISTS goods_request_pickup_geo_gix ON "GoodsRequest" USING GIST ("pickupGeo")',
  'CREATE INDEX IF NOT EXISTS goods_request_drop_geo_gix ON "GoodsRequest" USING GIST ("dropGeo")',
  'CREATE INDEX IF NOT EXISTS driver_location_point_gix ON "DriverLocation" USING GIST ("point")',
];

async function run(statements) {
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

try {
  if (mode === "extension" || mode === "all") await run(extensionStatements);
  if (mode === "indexes" || mode === "all") await run(indexStatements);
  console.log(`[postgis] ${mode} complete`);
} finally {
  await prisma.$disconnect();
}
