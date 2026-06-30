# Backhaul

**Return Trips Made Useful**

Backhaul is a dynamic fixed-price marketplace that matches verified return vehicles with passengers (`RouteMate`) and goods senders (`LoadMate`) travelling along the same or a nearby route. Vehicle owners are `Backhaul Captains`, business users are `Merchants`, and administrators work in `Control Hub`.

This is a full-stack MVP, not a static route demo. Captains can create any route from map coordinates, searches query stored trips, and the matching and pricing engines calculate results at request time.

## Included features

- Dynamic OpenStreetMap pickup/drop selection via place search, browser location or map click
- Passenger route matching by route proximity, direction, time, seats and passenger permit
- Nearby-route goods matching by route projection, detour, capacity, goods type, cold storage and goods permit
- Server-side passenger and goods pricing with a visible breakdown
- Transactional capacity reservation when a booking is confirmed
- Email/password auth, strong registration validation, unique username suggestions and mock OTP
- English, Telugu and Hindi UI switching
- Captain profile, vehicle registration, local document uploads and verification states
- Control Hub approval/rejection for Captains, vehicles and individual documents
- Login-first route protection with role redirects and clear permission messages
- Post-login session role selection (`sr` JWT claim) for RouteMate, LoadMate and Backhaul Captain
- Captain “looking for passengers” availability toggle and passenger live-refresh matching
- Role dashboards for RouteMate, LoadMate, Merchant, Captain and Control Hub
- Professional public landing page with local transport/map placeholder visuals in `public/images/`
- Mock UPI/card/cash payments, pickup/delivery OTPs and simulated live movement
- Goods photo and delivery-proof uploads using local MVP storage
- Dynamic popular routes, earnings, impact metrics, booking history and Captain ratings
- SQLite for a zero-cost local demo; Prisma models are straightforward to migrate to PostgreSQL/Supabase
- `/apps/api` and `/apps/mobile` scaffolds for the requested Express + Socket.io + PostgreSQL/PostGIS + Expo split

## Tech stack

- Next.js 14 App Router, React 18 and TypeScript
- Tailwind CSS
- Next.js REST route handlers
- Prisma ORM with SQLite
- JWT stored in an HTTP-only cookie and role checks in every protected API
- Leaflet + OpenStreetMap, with Nominatim search and a map-provider integration point
- Zod validation, bcrypt password hashing and Vitest engine tests

## Project structure

```text
app/
  (auth)/                 Login, registration, OTP, password and language pages
  (public)/               How it works, passenger, goods, driver, safety, pricing, contact
  api/                    REST auth, trips, matches, bookings, uploads, admin and dashboard APIs
  book/                   RouteMate and LoadMate map-centred booking flows
  dashboard/              Passenger, goods, Merchant, Captain and Control Hub dashboards
  tracking/[type]/[id]/   Simulated live tracking and delivery proof
components/
  map/                    Leaflet map and dynamic location picker
  *Dashboard.tsx          Role-specific database-backed dashboards
lib/
  auth.ts                 JWT and mock OTP helpers
  geo.ts                  Haversine and point-to-route projection
  matching.ts             Passenger/goods eligibility engine
  pricing.ts              Fixed smart pricing engine
  validation.ts           Registration and request validation
prisma/
  schema.prisma           Complete relational schema
  seed.ts                 Realistic demo users, vehicles, trips, bookings and pricing rules
tests/
  engines.test.ts         Geometry and pricing tests
public/uploads/           Local MVP upload target
public/images/            Replaceable transport/map/safety placeholder visuals
middleware.ts             Login-first and role-based page protection
```

## Local setup

Use Node.js 20 or newer and pnpm.

```bash
pnpm install
copy .env.example .env
pnpm db:setup
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

On macOS/Linux, replace `copy .env.example .env` with `cp .env.example .env`.

If PowerShell says `pnpm` is not recognized, add the bundled runtime to the current terminal session first:

```powershell
$env:Path = "C:\Users\SUSHMA SHYAMALA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;C:\Users\SUSHMA SHYAMALA\.cache\codex-runtimes\codex-primary-runtime\dependencies\bin;$env:Path"
node --version
pnpm --version
```

Expected output is a Node version line such as `v24.14.0` and a pnpm version line such as `11.7.0`.

Expected local run flow:

```powershell
pnpm db:setup
```

Expected output: Prisma Client is generated, SQLite is synced, and the terminal ends with `Backhaul demo data seeded. Password for all demo users: Demo@123`.

```powershell
pnpm dev
```

Expected output:

```text
▲ Next.js 14.2.35
- Local: http://localhost:3000
✓ Ready in ...
```

Useful commands:

```bash
pnpm db:generate   # generate Prisma client
pnpm db:push       # sync schema to SQLite
pnpm db:seed       # reset/reseed realistic demo data
pnpm test          # geometry and pricing tests
pnpm build         # full production type-check and build
pnpm start         # serve the production build
```

`DATABASE_URL="file:./dev.db"` creates `prisma/dev.db`. To start clean, run `pnpm db:seed`; the seed intentionally resets local demo records.

## Demo accounts

Every demo account uses password `Demo@123`.

| UI role | Email | What to test |
|---|---|---|
| RouteMate | `passenger@backhaul.test` | Seat history, OTP, tracking and ratings |
| LoadMate | `goods@backhaul.test` | Goods request and nearby-route matching |
| Merchant | `merchant@backhaul.test` | Business goods dashboard, repeat routes and shipment history |
| Backhaul Captain | `driver@backhaul.test` | Approved vehicle, trip posting, requests and earnings |
| Control Hub | `admin@backhaul.test` | Analytics, users, verification, trips and pricing rules |
| Second Captain | `truck@backhaul.test` | Approved goods-permitted pickup |

New local registrations use mock OTP `123456`. Production mode generates a random code; connect `EMAIL_*` or an SMS provider before deploying it.

## Login-first access flow

Public users can view the landing page and informational pages only. Protected pages such as `/book/passenger`, `/book/goods`, `/post-trip`, `/verification`, `/tracking/*`, `/history`, `/rating` and `/dashboard/*` require login.

- Not logged in: redirected to `/login` with `Please login to access Backhaul services.`
- Wrong credentials: login stays on the page and shows `Invalid credentials. Please check your login details or create a new account.` plus a register button
- Valid RouteMate/LoadMate/Captain login: redirected to `/select-role`; the selected role is written into the JWT as `sr`
- Logged in but wrong role: redirected to the correct role dashboard with `You do not have permission to access this module.`
- RouteMate can access passenger booking/dashboard only
- LoadMate can access goods booking/dashboard only
- Merchant can access the business goods dashboard and goods booking flow
- Backhaul Captain can access driver dashboard, verification and post-trip screens; pending Captains cannot publish trips
- Control Hub can access admin modules only

## Availability matching flow

The working web app now includes the requested dynamic availability flags:

- `ReturnTrip.isLookingForPassengers`
- `PassengerBooking.isLookingForRide`

Captains can toggle “Looking for passengers” / “Mark full” from the driver dashboard. Passenger matching filters only:

```text
status = ACTIVE
isLookingForPassengers = true
passenger isLookingForRide = true
capacity/time/detour/permit rules pass
```

The passenger booking screen live-refreshes matches after a search, so when the seeded Captain is marked full the match disappears automatically. PATCH responses include the intended Socket.io event shape:

```text
availability:update → route:<from>-<to>
```

Seed check: RouteMate searching Hyderabad → Srisailam sees the seeded approved Captain; toggling that Captain off returns zero matches; toggling back on restores the match.

## API/mobile scaffold status

This repository did not actually contain `/apps/api`, `/apps/web`, or `/apps/mobile` when audited. The current working app remains the root Next.js app. I added safe scaffolds:

- `apps/api`: Express + Socket.io TypeScript server, PostgreSQL Prisma schema with `Role` enum, `Role[]`, availability flags and PostGIS `geography(Point,4326)` fields
- `apps/api/prisma/postgis.sql`: PostGIS extension and GiST indexes
- `apps/mobile`: Expo-oriented role selector and `expo-location` helper for 5-second driver GPS streaming

These scaffolds are intentionally excluded from the root Next.js build until their dependencies are installed. `psql` was not available on this machine and `.env` currently points at SQLite, so the PostgreSQL migration/`psql backhaul` verification step is not run in this local workspace yet.

## How dynamic routes work

1. A Captain selects arbitrary origin and destination coordinates and enters departure, capacity, detour and allowed-goods rules.
2. The API estimates road distance from Haversine distance with a road factor, duration from average road speed, and stores coordinates/polyline data in `ReturnTrip`.
3. A user independently chooses pickup/drop coordinates; there is no predefined route lookup.
4. `pointToRoute` projects each requested point onto each candidate trip segment. Progress along the segment checks travel direction; perpendicular distance becomes pickup/drop detour.
5. Matching filters active database trips by date window, direction, detour, remaining capacity, permit and allowed goods type.
6. Matches are sorted by route closeness/detour, fare, Captain rating and departure.

The MVP uses straight route segments and Haversine/equirectangular approximations when no routing key exists. A production OSRM, Mapbox or Google Directions adapter can replace the distance/polyline implementation without changing the stored location model.

## Passenger matching

- Only `ACTIVE` trips in the selected time window are queried.
- Pickup and drop must project onto the route in the correct order.
- Combined nearby-route distance must fit the configured proximity/detour limit.
- Seats must still be available.
- The vehicle permit must be `PASSENGER` or `BOTH`.
- Booking repeats all checks and pricing on the server, then decrements seats transactionally.

## Goods matching

- Pickup and drop can be near the route; exact destination equality is unnecessary.
- The sum of both route deviations must be within the Captain's `maxDetourKm`.
- Remaining kg capacity, goods permit and allowed goods types are enforced.
- Cold-storage requests require a refrigerated vehicle type.
- A rule engine suggests `BIKE`, `GOODS_AUTO`, `PICKUP`, `VAN` or `MINI_TRUCK` by weight/size.
- Booking creates a `GoodsRequest`, reserves kg capacity, creates both OTPs and records mock payment data in one transaction.

## Fixed smart pricing

Pricing rules live in `PricingRule` and are editable from Control Hub. APIs never accept a client-provided fare.

Passenger pricing:

```text
Fuel = segment distance / vehicle mileage × fuel price
Subtotal = fuel + toll estimate + Captain base earning + detour
Platform fee = subtotal × rule percentage
Per-seat fare = (subtotal + fee) / currently available seats
Final = max(minimum fare, (per-seat fare − return discount) × seats requested)
```

Goods pricing:

```text
Subtotal = minimum/base fare + distance × km rate + weight × kg rate + detour × detour rate
Final = subtotal + platform percentage
```

The booking flow displays every component to reduce bargaining.

## Maps and location selection

- Leaflet tiles come from OpenStreetMap and need no API key.
- Search is proxied through `/api/geocode` to Nominatim; if it is offline, users can still click the map.
- Browser geolocation populates the active pickup/drop point after the user grants permission.
- Pickup/drop markers and a dynamic route line update immediately.
- Matching vehicle markers come from API results.
- The tracking screen interpolates a mock live marker along the actual booking endpoints.

`GOOGLE_MAPS_API_KEY` is reserved in `.env`. To switch providers, keep the `LocationPoint` contract (`name`, `lat`, `lng`) and replace `components/map/LeafletMap.tsx` plus the geocoding implementation.

## Verification and legal service separation

New Captains and vehicles start as `PENDING`. A Captain can add details and upload profile/licence, vehicle photos, RC, insurance, PUC, permit and fitness documents at `/verification`. Control Hub approves/rejects the Captain, vehicle and documents independently.

Both the UI and server prevent public trip posting until the Captain and selected vehicle are approved. Matching always checks the vehicle permit:

- passenger requests: `PASSENGER` or `BOTH`
- goods requests: `GOODS` or `BOTH`

Capacity and allowed goods are stored separately; unsafe service mixing is never inferred from a vehicle name.

## Mock/free fallbacks

- OTP: local code `123456`
- Payment: cash, mock UPI or mock card records; Razorpay environment variables are reserved
- Tracking: timer-based movement between stored booking coordinates
- Uploads: `public/uploads`; Cloudinary variables are reserved
- Maps/search: Leaflet, OpenStreetMap and Nominatim
- Email/SMS: in-app mock confirmation

Do not use these mock mechanisms as production security controls.

## Database migration to PostgreSQL/Supabase

For production, change the Prisma datasource provider to `postgresql`, set a PostgreSQL `DATABASE_URL`, convert JSON-encoded list strings to PostgreSQL `Json` fields if desired, then run:

```bash
pnpm prisma migrate dev --name init
pnpm db:seed
```

Use private object storage for documents, database migrations rather than `db push`, rate limiting, audited admin actions, encrypted sensitive fields and a queue for notifications.

## Environment variables

Copy `.env.example`. The app only requires `DATABASE_URL` and `JWT_SECRET` locally; every paid-service variable may remain empty.

## Future improvements

- OSRM/Google route polylines and turn-aware point-to-polyline distance
- WebSocket/GPS live tracking and reliable trip state transitions
- Real OTP delivery and account recovery
- Razorpay payment intents, refunds and Captain settlement ledger
- Cloudinary/Supabase signed uploads and malware scanning
- Document OCR, permit expiry alerts and audit history
- Stronger session revocation, rate limiting, CSRF protection and device verification
- Merchant teams, recurring loads, notifications and advanced route optimization
- Automated end-to-end browser tests and accessibility audits

## Verification status

The checked-in project has been verified with:

- `pnpm test` — 4 engine tests passing
- `pnpm build` — 52 pages/API routes compiled and production build completed
- runtime browser check — landing page, Leaflet initialization and RouteMate demo login/dashboard
- runtime API check — dynamic passenger match, goods nearby-route match, computed fares and database-ranked popular routes
