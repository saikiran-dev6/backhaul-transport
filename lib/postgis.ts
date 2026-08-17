import type { PrismaClient } from "@prisma/client";

type DbLike = Pick<PrismaClient, "$executeRaw">;

export async function setTripGeo(db: DbLike, id: string, fromLng: number, fromLat: number, toLng: number, toLat: number) {
  await db.$executeRaw`
    UPDATE "ReturnTrip"
    SET
      "fromGeo" = ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
      "toGeo" = ST_SetSRID(ST_MakePoint(${toLng}, ${toLat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}

export async function setPassengerBookingGeo(db: DbLike, id: string, pickupLng: number, pickupLat: number, dropLng: number, dropLat: number) {
  await db.$executeRaw`
    UPDATE "PassengerBooking"
    SET
      "pickupGeo" = ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography,
      "dropGeo" = ST_SetSRID(ST_MakePoint(${dropLng}, ${dropLat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}

export async function setGoodsRequestGeo(db: DbLike, id: string, pickupLng: number, pickupLat: number, dropLng: number, dropLat: number) {
  await db.$executeRaw`
    UPDATE "GoodsRequest"
    SET
      "pickupGeo" = ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography,
      "dropGeo" = ST_SetSRID(ST_MakePoint(${dropLng}, ${dropLat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}

export async function setDriverLocationPoint(db: DbLike, id: string, lng: number, lat: number) {
  await db.$executeRaw`
    UPDATE "DriverLocation"
    SET "point" = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}
