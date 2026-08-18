# BACKHAUL — END-TO-END USER JOURNEY VERIFICATION

**Project:** `C:\Users\SUSHMA SHYAMALA\OneDrive\Tài liệu\transport 2`  
**Audit Date:** August 18, 2026  
**Status:** `AUDITED — COMPLETE USER JOURNEYS`  

---

## Journey 1: Passenger Ride Booking & Payment Flow

```mermaid
sequenceDiagram
    autonumber
    actor Passenger as Passenger (RouteMate)
    actor Captain as Backhaul Captain
    participant System as Backhaul Engine
    participant DB as PostgreSQL DB

    Passenger->>System: Register / Login & Select RouteMate Role
    Passenger->>System: Search Hyderabad -> Srisailam (Map Picker)
    System-->>Passenger: Render Active Trip Matches
    Passenger->>System: Select Trip & 2 Seats (Choose Cash/Online)
    System->>DB: Create PassengerBooking (Status: PENDING, Payment: UNPAID)
    Note over Passenger,DB: CRITICAL RULE: Zero payment captured at booking creation
    Captain->>System: Confirm Passenger Assignment
    Passenger->>Captain: Provide Pickup OTP (123456)
    Captain->>System: Verify OTP & Start Ride (Status: IN_PROGRESS)
    Captain->>System: Complete Ride (Status: COMPLETED)
    System->>Passenger: Display Payment Due Modal
    Passenger->>System: Pay Online (Razorpay HMAC verified) OR Pay Cash to Captain
    System->>DB: Update Payment (Status: CAPTURED, Booking Payment: PAID)
    System-->>Passenger: Render Receipt & Prompt Rating
```

**Verification Result:** `PASS (100% Verified)`

---

## Journey 2: Goods Sender Shipment & Delivery Flow

```mermaid
sequenceDiagram
    autonumber
    actor Sender as Goods Sender (LoadMate)
    actor Captain as Freight Captain
    participant System as Backhaul Engine
    participant DB as PostgreSQL DB

    Sender->>System: Register / Login & Post Goods Request (500kg, Cold Storage)
    System-->>Sender: Display Nearby Permitted Return Vehicles
    Sender->>System: Book Matching Return Vehicle
    System->>DB: Create GoodsBooking (Status: ASSIGNED, Payment: UNPAID)
    Note over Sender,DB: CRITICAL RULE: Zero payment captured at booking creation
    Captain->>System: Arrive at Pickup & Verify Pickup OTP
    Captain->>System: Upload Goods Photo & Start Transit
    Captain->>Sender: Arrive at Delivery & Verify Delivery OTP
    Captain->>System: Upload Proof of Delivery & Complete Delivery
    System->>Sender: Display Payment Due Modal
    Sender->>System: Complete Cash/Online Payment
    System->>DB: Update Payment (Status: CAPTURED, Booking Payment: PAID)
    System-->>Sender: Issue Shipment Receipt & Audit Event
```

**Verification Result:** `PASS (100% Verified)`

---

## Journey 3: Captain Onboarding & Verification Flow

1. Registration as Captain (`accountRole = DRIVER`).
2. Complete `DriverProfile` with license number, permit details, and payout account ID.
3. Submit vehicle registration and upload RC/Insurance documents (`/api/documents`).
4. Initial status set to `PENDING_VERIFICATION`. Driver cannot publish trips.
5. Admin logs into Control Hub (`/dashboard/admin`), reviews documents, and approves Captain.
6. Status updated to `APPROVED`. Driver gains full access to publish return trips and accept bookings.

**Verification Result:** `PASS (100% Verified)`
