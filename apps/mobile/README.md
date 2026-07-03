# Backhaul mobile scaffold

This Expo scaffold shares the same REST + Socket.io backend contract as the web app.

Implemented pieces:

- `SelectRoleModal` for RouteMate, LoadMate and Captain session role selection
- `socket.ts` helper for joining route rooms and receiving `availability:update`
- `location.ts` helper that streams Captain GPS every 5 seconds while driving

Run after installing dependencies:

```bash
pnpm install
set EXPO_PUBLIC_API_URL=http://localhost:4000
pnpm dev
```
