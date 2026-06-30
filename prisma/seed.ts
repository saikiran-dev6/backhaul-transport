import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.rating.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.goodsBooking.deleteMany();
  await prisma.goodsRequest.deleteMany();
  await prisma.passengerBooking.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.returnTrip.deleteMany();
  await prisma.driverDocument.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.pricingRule.deleteMany();

  const passwordHash = await bcrypt.hash("Demo@123", 10);
  await prisma.pricingRule.createMany({
    data: [
      { vehicleType: "DEFAULT", fuelPrice: 105, baseFarePerKm: 9, platformFeePercent: 8, minimumFare: 120, seatDiscountPercent: 15, goodsWeightRate: 1.2, driverBaseEarning: 110, detourRatePerKm: 12 },
      { vehicleType: "CAR", fuelPrice: 105, baseFarePerKm: 11, platformFeePercent: 8, minimumFare: 130, seatDiscountPercent: 18, goodsWeightRate: 1.4, driverBaseEarning: 140, detourRatePerKm: 14 },
      { vehicleType: "TAXI", fuelPrice: 105, baseFarePerKm: 12, platformFeePercent: 8, minimumFare: 150, seatDiscountPercent: 15, goodsWeightRate: 1.5, driverBaseEarning: 150, detourRatePerKm: 15 },
      { vehicleType: "VAN", fuelPrice: 96, baseFarePerKm: 14, platformFeePercent: 9, minimumFare: 220, seatDiscountPercent: 12, goodsWeightRate: 1.1, driverBaseEarning: 220, detourRatePerKm: 18 },
      { vehicleType: "GOODS_AUTO", fuelPrice: 105, baseFarePerKm: 10, platformFeePercent: 8, minimumFare: 160, seatDiscountPercent: 0, goodsWeightRate: 1.1, driverBaseEarning: 130, detourRatePerKm: 13 },
      { vehicleType: "PICKUP", fuelPrice: 96, baseFarePerKm: 15, platformFeePercent: 9, minimumFare: 250, seatDiscountPercent: 0, goodsWeightRate: 1.3, driverBaseEarning: 240, detourRatePerKm: 19 },
      { vehicleType: "MINI_TRUCK", fuelPrice: 96, baseFarePerKm: 19, platformFeePercent: 10, minimumFare: 400, seatDiscountPercent: 0, goodsWeightRate: 1.5, driverBaseEarning: 350, detourRatePerKm: 24 }
    ],
  });

  const routeMate = await prisma.user.create({ data: { fullName: "Ananya Rao", username: "ananya_route", phone: "9876500001", email: "passenger@backhaul.test", passwordHash, role: "ROUTEMATE", roles: JSON.stringify(["ROUTEMATE"]), language: "en", otpVerified: true } });
  const loadMate = await prisma.user.create({ data: { fullName: "Ravi Traders", username: "ravi_loads", phone: "9876500002", email: "goods@backhaul.test", passwordHash, role: "LOADMATE", roles: JSON.stringify(["LOADMATE"]), language: "te", otpVerified: true } });
  const merchant = await prisma.user.create({ data: { fullName: "Sri Lakshmi Wholesale", username: "lakshmi_merchant", phone: "9876500006", email: "merchant@backhaul.test", passwordHash, role: "MERCHANT", roles: JSON.stringify(["LOADMATE"]), language: "en", otpVerified: true } });
  await prisma.user.create({ data: { fullName: "Backhaul Control Hub", username: "control_hub", phone: "9876500003", email: "admin@backhaul.test", passwordHash, role: "ADMIN", roles: JSON.stringify(["ADMIN"]), language: "en", otpVerified: true } });

  const captainUser = await prisma.user.create({ data: { fullName: "Arjun Reddy", username: "captain_arjun", phone: "9876500004", email: "driver@backhaul.test", passwordHash, role: "CAPTAIN", roles: JSON.stringify(["CAPTAIN"]), language: "te", otpVerified: true } });
  const captain = await prisma.driverProfile.create({ data: { userId: captainUser.id, licenseNumber: "DL-AP-2024-4172", verificationStatus: "APPROVED", rating: 4.8, totalTrips: 68, emergencyContact: "9876500040", bankUpiDetails: "arjun@upi" } });
  const car = await prisma.vehicle.create({ data: { driverId: captain.id, vehicleNumber: "TS09AB4172", vehicleType: "CAR", permitType: "PASSENGER", passengerCapacity: 4, goodsCapacityKg: 25, fuelType: "PETROL", mileageKmPerLiter: 17, insuranceStatus: "APPROVED", pucStatus: "APPROVED", fitnessStatus: "APPROVED", verificationStatus: "APPROVED" } });

  const goodsCaptainUser = await prisma.user.create({ data: { fullName: "Suresh Kumar", username: "captain_suresh", phone: "9876500005", email: "truck@backhaul.test", passwordHash, role: "CAPTAIN", roles: JSON.stringify(["CAPTAIN"]), language: "hi", otpVerified: true } });
  const goodsCaptain = await prisma.driverProfile.create({ data: { userId: goodsCaptainUser.id, licenseNumber: "DL-TG-2023-8831", verificationStatus: "APPROVED", rating: 4.6, totalTrips: 103, emergencyContact: "9876500050", bankUpiDetails: "suresh@upi" } });
  const pickup = await prisma.vehicle.create({ data: { driverId: goodsCaptain.id, vehicleNumber: "AP16TK8831", vehicleType: "PICKUP", permitType: "GOODS", passengerCapacity: 0, goodsCapacityKg: 900, fuelType: "DIESEL", mileageKmPerLiter: 13, insuranceStatus: "APPROVED", pucStatus: "APPROVED", fitnessStatus: "APPROVED", verificationStatus: "APPROVED" } });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 30, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  dayAfter.setHours(7, 0, 0, 0);

  const passengerTrip = await prisma.returnTrip.create({ data: { driverId: captain.id, vehicleId: car.id, fromLocationName: "Hyderabad, Telangana", fromLat: 17.385, fromLng: 78.4867, toLocationName: "Srisailam, Andhra Pradesh", toLat: 16.0728, toLng: 78.8686, routeDistanceKm: 213, estimatedDurationMin: 270, routePolyline: JSON.stringify([[17.385, 78.4867], [16.0728, 78.8686]]), departureTime: tomorrow, availableSeats: 3, availableGoodsCapacityKg: 0, maxDetourKm: 12, allowedGoodsTypes: "[]", fixedBasePrice: 320, isLookingForPassengers: true, status: "ACTIVE" } });
  await prisma.returnTrip.create({ data: { driverId: goodsCaptain.id, vehicleId: pickup.id, fromLocationName: "Guntur, Andhra Pradesh", fromLat: 16.3067, fromLng: 80.4365, toLocationName: "Hyderabad, Telangana", toLat: 17.385, toLng: 78.4867, routeDistanceKm: 270, estimatedDurationMin: 320, routePolyline: JSON.stringify([[16.3067, 80.4365], [17.385, 78.4867]]), departureTime: dayAfter, availableSeats: 0, availableGoodsCapacityKg: 750, maxDetourKm: 30, allowedGoodsTypes: JSON.stringify(["PARCEL", "GROCERIES", "BOXES", "FURNITURE", "AGRICULTURE"]), fixedBasePrice: 800, isLookingForPassengers: false, status: "ACTIVE" } });

  const booking = await prisma.passengerBooking.create({ data: { tripId: passengerTrip.id, passengerId: routeMate.id, seatsBooked: 1, pickupName: "LB Nagar, Hyderabad", pickupLat: 17.3457, pickupLng: 78.5522, dropName: "Srisailam", dropLat: 16.0728, dropLng: 78.8686, fare: 489, pickupOtp: "348921", bookingStatus: "CONFIRMED", paymentStatus: "PAID", isLookingForRide: true } });
  await prisma.payment.create({ data: { bookingId: booking.id, bookingType: "PASSENGER", amount: 489, platformFee: 36.22, driverEarning: 452.78, method: "UPI", status: "PAID" } });
  await prisma.goodsRequest.create({ data: { senderId: loadMate.id, pickupName: "Guntur Market", pickupLat: 16.3067, pickupLng: 80.4365, dropName: "Suryapet", dropLat: 17.1402, dropLng: 79.6207, goodsType: "AGRICULTURE", weightKg: 180, quantity: 6, sizeDescription: "6 medium crates", isFragile: false, requiresColdStorage: false, status: "OPEN" } });
  await prisma.goodsRequest.create({ data: { senderId: merchant.id, pickupName: "Vijayawada Wholesale Market", pickupLat: 16.5062, pickupLng: 80.648, dropName: "Hyderabad Warehouse", dropLat: 17.385, dropLng: 78.4867, goodsType: "BOXES", weightKg: 420, quantity: 24, sizeDescription: "24 sealed retail cartons", isFragile: false, requiresColdStorage: false, status: "OPEN" } });

  console.log("Backhaul demo data seeded. Password for all demo users: Demo@123");
}

main().finally(() => prisma.$disconnect());
