CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS return_trip_from_geo_gix ON "ReturnTrip" USING GIST ("fromGeo");
CREATE INDEX IF NOT EXISTS return_trip_to_geo_gix ON "ReturnTrip" USING GIST ("toGeo");
CREATE INDEX IF NOT EXISTS return_trip_passenger_availability_idx ON "ReturnTrip" ("status", "departureTime", "isLookingForPassengers");
CREATE INDEX IF NOT EXISTS return_trip_goods_availability_idx ON "ReturnTrip" ("status", "departureTime", "isLookingForGoods");
CREATE INDEX IF NOT EXISTS passenger_booking_pickup_geo_gix ON "PassengerBooking" USING GIST ("pickupGeo");
CREATE INDEX IF NOT EXISTS passenger_booking_drop_geo_gix ON "PassengerBooking" USING GIST ("dropGeo");
