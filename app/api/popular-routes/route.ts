import { db } from "@/lib/db";
import { apiSuccess } from "@/lib/apiResponse";

export const dynamic = "force-dynamic";

export async function GET() {
  const trips = await db.returnTrip.findMany({ where: { status: { in: ["ACTIVE", "COMPLETED"] } }, include: { _count: { select: { passengerBookings: true, goodsBookings: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const grouped = new Map<string, { from: string; to: string; activity: number; nextDeparture: Date }>();
  for (const trip of trips) {
    const key = `${trip.fromLocationName.toLowerCase()}::${trip.toLocationName.toLowerCase()}`;
    const score = 1 + trip._count.passengerBookings + trip._count.goodsBookings;
    const current = grouped.get(key);
    grouped.set(key, { from: trip.fromLocationName, to: trip.toLocationName, activity: score + (current?.activity || 0), nextDeparture: current && current.nextDeparture < trip.departureTime ? current.nextDeparture : trip.departureTime });
  }
  return apiSuccess({ routes: Array.from(grouped.values()).sort((a, b) => b.activity - a.activity).slice(0, 6) }, "Popular routes loaded");
}
