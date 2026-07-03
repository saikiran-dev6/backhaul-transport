# Backhaul API scaffold

This is the Express + Socket.io + PostgreSQL/PostGIS backend scaffold requested for the monorepo split.

## Run locally

```bash
copy .env.example .env
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Expected API URL: `http://localhost:4000`.

The seed creates:

- one approved Captain
- one active Hyderabad -> Srisailam `ReturnTrip`
- one RouteMate `PassengerBooking` with `isLookingForRide = true`

## Socket event

The availability PATCH routes emit:

```text
availability:update -> route:<from>-<to>
```
