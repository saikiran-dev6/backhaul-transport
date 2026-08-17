-- AlterTable
ALTER TABLE "PassengerBooking" ADD COLUMN IF NOT EXISTS "pickupOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "otpAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "GoodsBooking" ADD COLUMN IF NOT EXISTS "pickupOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "deliveryOtpVerifiedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "otpAttemptCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "passengerBookingId" TEXT,
ADD COLUMN IF NOT EXISTS "goodsBookingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PassengerBooking_idempotencyKey_key" ON "PassengerBooking"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GoodsBooking_idempotencyKey_key" ON "GoodsBooking"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PassengerBooking_idempotencyKey_idx" ON "PassengerBooking"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "GoodsBooking_idempotencyKey_idx" ON "GoodsBooking"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_passengerBookingId_idx" ON "Payment"("passengerBookingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payment_goodsBookingId_idx" ON "Payment"("goodsBookingId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_passengerBookingId_fkey') THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_passengerBookingId_fkey" FOREIGN KEY ("passengerBookingId") REFERENCES "PassengerBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Payment_goodsBookingId_fkey') THEN
        ALTER TABLE "Payment" ADD CONSTRAINT "Payment_goodsBookingId_fkey" FOREIGN KEY ("goodsBookingId") REFERENCES "GoodsBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
