CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE "Role" AS ENUM ('ROUTEMATE', 'LOADMATE', 'CAPTAIN', 'MERCHANT', 'ADMIN');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "roles" "Role"[] DEFAULT ARRAY[]::"Role"[],
    "language" TEXT NOT NULL DEFAULT 'en',
    "otpVerified" BOOLEAN NOT NULL DEFAULT false,
    "otpCode" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "profilePhoto" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "totalTrips" INTEGER NOT NULL DEFAULT 0,
    "emergencyContact" TEXT,
    "bankUpiDetails" TEXT,
    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleNumber" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "permitType" TEXT NOT NULL,
    "passengerCapacity" INTEGER NOT NULL DEFAULT 0,
    "goodsCapacityKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fuelType" TEXT NOT NULL DEFAULT 'PETROL',
    "mileageKmPerLiter" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "insuranceStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "pucStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "fitnessStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverDocument" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "documentType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReturnTrip" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fromLocationName" TEXT NOT NULL,
    "fromLat" DOUBLE PRECISION NOT NULL,
    "fromLng" DOUBLE PRECISION NOT NULL,
    "fromGeo" geography(Point,4326),
    "toLocationName" TEXT NOT NULL,
    "toLat" DOUBLE PRECISION NOT NULL,
    "toLng" DOUBLE PRECISION NOT NULL,
    "toGeo" geography(Point,4326),
    "routeDistanceKm" DOUBLE PRECISION NOT NULL,
    "estimatedDurationMin" INTEGER NOT NULL,
    "routePolyline" TEXT,
    "departureTime" TIMESTAMP(3) NOT NULL,
    "availableSeats" INTEGER NOT NULL DEFAULT 0,
    "availableGoodsCapacityKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxDetourKm" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "allowedPickupPoints" TEXT NOT NULL DEFAULT '[]',
    "allowedDropPoints" TEXT NOT NULL DEFAULT '[]',
    "allowedGoodsTypes" TEXT NOT NULL DEFAULT '[]',
    "fixedBasePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isLookingForPassengers" BOOLEAN NOT NULL DEFAULT true,
    "isLookingForGoods" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReturnTrip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PassengerBooking" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "passengerId" TEXT NOT NULL,
    "seatsBooked" INTEGER NOT NULL,
    "pickupName" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "pickupGeo" geography(Point,4326),
    "dropName" TEXT NOT NULL,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "dropGeo" geography(Point,4326),
    "fare" DOUBLE PRECISION NOT NULL,
    "pickupOtp" TEXT NOT NULL,
    "bookingStatus" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "isLookingForRide" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PassengerBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoodsRequest" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "pickupName" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION NOT NULL,
    "pickupLng" DOUBLE PRECISION NOT NULL,
    "pickupGeo" geography(Point,4326),
    "dropName" TEXT NOT NULL,
    "dropLat" DOUBLE PRECISION NOT NULL,
    "dropLng" DOUBLE PRECISION NOT NULL,
    "dropGeo" geography(Point,4326),
    "goodsType" TEXT NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sizeDescription" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isFragile" BOOLEAN NOT NULL DEFAULT false,
    "requiresColdStorage" BOOLEAN NOT NULL DEFAULT false,
    "isHeavy" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoodsBooking" (
    "id" TEXT NOT NULL,
    "goodsRequestId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "pickupOtp" TEXT NOT NULL,
    "deliveryOtp" TEXT NOT NULL,
    "pickupStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "deliveryProofUrl" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoodsBooking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "driverEarning" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tripId" TEXT,
    "complaintType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "fuelPrice" DOUBLE PRECISION NOT NULL,
    "baseFarePerKm" DOUBLE PRECISION NOT NULL,
    "platformFeePercent" DOUBLE PRECISION NOT NULL,
    "minimumFare" DOUBLE PRECISION NOT NULL,
    "seatDiscountPercent" DOUBLE PRECISION NOT NULL,
    "goodsWeightRate" DOUBLE PRECISION NOT NULL,
    "driverBaseEarning" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "detourRatePerKm" DOUBLE PRECISION NOT NULL DEFAULT 12,
    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DriverLocation" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tripId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "point" geography(Point,4326),
    "status" TEXT NOT NULL DEFAULT 'DRIVING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DriverLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TripEvent" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");
CREATE INDEX "DriverProfile_verificationStatus_idx" ON "DriverProfile"("verificationStatus");
CREATE UNIQUE INDEX "Vehicle_vehicleNumber_key" ON "Vehicle"("vehicleNumber");
CREATE INDEX "Vehicle_permitType_idx" ON "Vehicle"("permitType");
CREATE INDEX "Vehicle_vehicleType_idx" ON "Vehicle"("vehicleType");
CREATE INDEX "Vehicle_verificationStatus_idx" ON "Vehicle"("verificationStatus");
CREATE INDEX "ReturnTrip_status_idx" ON "ReturnTrip"("status");
CREATE INDEX "ReturnTrip_departureTime_idx" ON "ReturnTrip"("departureTime");
CREATE INDEX "ReturnTrip_isLookingForPassengers_idx" ON "ReturnTrip"("isLookingForPassengers");
CREATE INDEX "ReturnTrip_isLookingForGoods_idx" ON "ReturnTrip"("isLookingForGoods");
CREATE INDEX "ReturnTrip_status_departureTime_isLookingForPassengers_idx" ON "ReturnTrip"("status", "departureTime", "isLookingForPassengers");
CREATE INDEX "ReturnTrip_status_departureTime_isLookingForGoods_idx" ON "ReturnTrip"("status", "departureTime", "isLookingForGoods");
CREATE INDEX "PassengerBooking_passengerId_createdAt_idx" ON "PassengerBooking"("passengerId", "createdAt");
CREATE INDEX "PassengerBooking_bookingStatus_idx" ON "PassengerBooking"("bookingStatus");
CREATE INDEX "PassengerBooking_paymentStatus_idx" ON "PassengerBooking"("paymentStatus");
CREATE INDEX "PassengerBooking_isLookingForRide_idx" ON "PassengerBooking"("isLookingForRide");
CREATE INDEX "GoodsRequest_senderId_createdAt_idx" ON "GoodsRequest"("senderId", "createdAt");
CREATE INDEX "GoodsRequest_status_idx" ON "GoodsRequest"("status");
CREATE INDEX "GoodsRequest_goodsType_idx" ON "GoodsRequest"("goodsType");
CREATE INDEX "GoodsBooking_tripId_createdAt_idx" ON "GoodsBooking"("tripId", "createdAt");
CREATE INDEX "GoodsBooking_deliveryStatus_idx" ON "GoodsBooking"("deliveryStatus");
CREATE INDEX "GoodsBooking_paymentStatus_idx" ON "GoodsBooking"("paymentStatus");
CREATE INDEX "Payment_bookingId_bookingType_idx" ON "Payment"("bookingId", "bookingType");
CREATE UNIQUE INDEX "PricingRule_vehicleType_key" ON "PricingRule"("vehicleType");
CREATE INDEX "DriverLocation_driverId_createdAt_idx" ON "DriverLocation"("driverId", "createdAt");
CREATE INDEX "DriverLocation_tripId_createdAt_idx" ON "DriverLocation"("tripId", "createdAt");
CREATE INDEX "TripEvent_tripId_createdAt_idx" ON "TripEvent"("tripId", "createdAt");
CREATE INDEX "TripEvent_type_createdAt_idx" ON "TripEvent"("type", "createdAt");
CREATE INDEX "AnalyticsEvent_type_createdAt_idx" ON "AnalyticsEvent"("type", "createdAt");
CREATE INDEX "AnalyticsEvent_userId_createdAt_idx" ON "AnalyticsEvent"("userId", "createdAt");

CREATE INDEX "return_trip_from_geo_gix" ON "ReturnTrip" USING GIST ("fromGeo");
CREATE INDEX "return_trip_to_geo_gix" ON "ReturnTrip" USING GIST ("toGeo");
CREATE INDEX "passenger_booking_pickup_geo_gix" ON "PassengerBooking" USING GIST ("pickupGeo");
CREATE INDEX "passenger_booking_drop_geo_gix" ON "PassengerBooking" USING GIST ("dropGeo");
CREATE INDEX "goods_request_pickup_geo_gix" ON "GoodsRequest" USING GIST ("pickupGeo");
CREATE INDEX "goods_request_drop_geo_gix" ON "GoodsRequest" USING GIST ("dropGeo");
CREATE INDEX "driver_location_point_gix" ON "DriverLocation" USING GIST ("point");

ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverDocument" ADD CONSTRAINT "DriverDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnTrip" ADD CONSTRAINT "ReturnTrip_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReturnTrip" ADD CONSTRAINT "ReturnTrip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerBooking" ADD CONSTRAINT "PassengerBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ReturnTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PassengerBooking" ADD CONSTRAINT "PassengerBooking_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsRequest" ADD CONSTRAINT "GoodsRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsBooking" ADD CONSTRAINT "GoodsBooking_goodsRequestId_fkey" FOREIGN KEY ("goodsRequestId") REFERENCES "GoodsRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GoodsBooking" ADD CONSTRAINT "GoodsBooking_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ReturnTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ReturnTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ReturnTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "DriverProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DriverLocation" ADD CONSTRAINT "DriverLocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ReturnTrip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "ReturnTrip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TripEvent" ADD CONSTRAINT "TripEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
