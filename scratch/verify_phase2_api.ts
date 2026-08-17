import { db } from "../lib/db";
import { createToken } from "../lib/auth";

async function verifyPhase2Api() {
  console.log("=== STARTING PHASE 2 MANUAL API VERIFICATION ===");

  // 1. Fetch seed users and trip
  const captain = await db.user.findFirst({ where: { role: "CAPTAIN" } });
  const passenger = await db.user.findFirst({ where: { role: "ROUTEMATE" } });
  const trip = await db.returnTrip.findFirst({ where: { status: "ACTIVE" }, include: { driver: true } });

  if (!captain || !passenger || !trip) {
    throw new Error("Seed data missing for manual API verification");
  }

  const captainToken = await createToken({ userId: trip.driver.userId, role: "CAPTAIN", name: "Demo Captain" });
  const passengerToken = await createToken({ userId: passenger.id, role: "ROUTEMATE", name: "Demo Passenger" });

  console.log(`[PASS] Auth tokens generated for Captain (${trip.driver.userId}) and Passenger (${passenger.id})`);

  // 2. Create passenger booking with idempotencyKey
  const idempotencyKey = "manual_test_key_" + Date.now();
  const booking = await db.passengerBooking.create({
    data: {
      tripId: trip.id,
      passengerId: passenger.id,
      seatsBooked: 1,
      pickupName: "LB Nagar",
      pickupLat: 17.3457,
      pickupLng: 78.5522,
      dropName: "Srisailam",
      dropLat: 16.0728,
      dropLng: 78.8686,
      fare: 250,
      pickupOtp: "654321",
      idempotencyKey,
      bookingStatus: "CONFIRMED",
    },
  });
  console.log(`[PASS] Test PassengerBooking created ID: ${booking.id}, pickupOtp: ${booking.pickupOtp}`);

  // 3. Test Invalid OTP Verification
  const verifyResInvalid = await fetch("http://localhost:3000/api/bookings/passenger/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({ bookingId: booking.id, otp: "000000" }),
  });
  const invalidJson = await verifyResInvalid.json();
  console.log(`[PASS] Invalid OTP Response Status: ${verifyResInvalid.status}, Body:`, invalidJson);
  if (verifyResInvalid.status !== 400) throw new Error("Expected status 400 for invalid OTP");

  // 4. Test Valid OTP Verification
  const verifyResValid = await fetch("http://localhost:3000/api/bookings/passenger/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${captainToken}` },
    body: JSON.stringify({ bookingId: booking.id, otp: "654321" }),
  });
  const validJson = await verifyResValid.json();
  console.log(`[PASS] Valid OTP Response Status: ${verifyResValid.status}, Body:`, validJson);
  if (verifyResValid.status !== 200) throw new Error("Expected status 200 for valid OTP");

  // 5. Test Unauthorized OTP Verification (Passenger trying to verify Captain OTP)
  const verifyResUnauth = await fetch("http://localhost:3000/api/bookings/passenger/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${passengerToken}` },
    body: JSON.stringify({ bookingId: booking.id, otp: "654321" }),
  });
  console.log(`[PASS] Unauthorized Role Response Status: ${verifyResUnauth.status}`);
  if (verifyResUnauth.status !== 403) throw new Error("Expected status 403 for unauthorized caller");

  // Cleanup test booking
  await db.passengerBooking.delete({ where: { id: booking.id } });
  console.log("=== ALL PHASE 2 MANUAL API VERIFICATIONS PASSED ===");
}

verifyPhase2Api().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
