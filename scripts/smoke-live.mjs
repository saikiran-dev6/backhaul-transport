import { spawn } from "node:child_process";

const port = Number(process.env.SMOKE_PORT || 3033);
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = "node_modules/next/dist/bin/next";

const server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverLog = "";
server.stdout.on("data", (chunk) => {
  serverLog += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverLog += chunk.toString();
});

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer() {
  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) return;
    } catch {}
    await delay(1000);
  }
  throw new Error(`Next server did not become ready on ${baseUrl}\n${serverLog}`);
}

function cookieFrom(response, fallback) {
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? setCookie.split(";")[0] : fallback;
}

async function parseJson(response, label) {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${label} failed with HTTP ${response.status}: ${body}`);
  }
  return body ? JSON.parse(body) : {};
}

async function postJson(path, body, cookie, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return { response, json: await parseJson(response, label) };
}

async function patchJson(path, body, cookie, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  return parseJson(response, label);
}

async function getJson(path, cookie, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : {},
  });
  return parseJson(response, label);
}

function tomorrowSearchTime() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(8, 30, 0, 0);
  return date.toISOString();
}

function goodsSearchTime() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  date.setHours(7, 0, 0, 0);
  return date.toISOString();
}

async function main() {
  await waitForServer();

  const driverLogin = await postJson(
    "/api/auth/login",
    { identifier: "driver@backhaul.test", password: "Demo@123" },
    undefined,
    "driver login",
  );
  let driverCookie = cookieFrom(driverLogin.response, undefined);
  const driverRole = await postJson(
    "/api/auth/session-role",
    { role: "CAPTAIN" },
    driverCookie,
    "driver session role",
  );
  driverCookie = cookieFrom(driverRole.response, driverCookie);
  const driverDashboard = await getJson("/api/dashboard", driverCookie, "driver dashboard");
  const smokeTrip = driverDashboard.trips?.find(
    (trip) => trip.fromLocationName.includes("Hyderabad") && trip.toLocationName.includes("Srisailam"),
  ) || driverDashboard.trips?.[0];
  const tripId = smokeTrip?.id;
  if (!tripId) throw new Error("Driver dashboard did not return a seeded trip");

  const passengerLogin = await postJson(
    "/api/auth/login",
    { identifier: "passenger@backhaul.test", password: "Demo@123" },
    undefined,
    "passenger login",
  );
  let passengerCookie = cookieFrom(passengerLogin.response, undefined);
  const passengerRole = await postJson(
    "/api/auth/session-role",
    { role: "ROUTEMATE" },
    passengerCookie,
    "passenger session role",
  );
  passengerCookie = cookieFrom(passengerRole.response, passengerCookie);

  const search = {
    pickup: { name: "LB Nagar, Hyderabad", lat: 17.3457, lng: 78.5522 },
    drop: { name: "Srisailam", lat: 16.0728, lng: 78.8686 },
    departureTime: tomorrowSearchTime(),
    seats: 1,
    luggageSize: "SMALL",
    isLookingForRide: true,
  };

  const before = (await postJson("/api/matches/passenger", search, passengerCookie, "initial passenger match")).json;
  const off = await patchJson(
    `/api/trips/${tripId}/availability`,
    { isLookingForPassengers: false },
    driverCookie,
    "toggle Captain off",
  );
  const afterOff = (await postJson("/api/matches/passenger", search, passengerCookie, "passenger match after off")).json;
  const on = await patchJson(
    `/api/trips/${tripId}/availability`,
    { isLookingForPassengers: true },
    driverCookie,
    "toggle Captain on",
  );
  const afterOn = (await postJson("/api/matches/passenger", search, passengerCookie, "passenger match after on")).json;

  const goodsLogin = await postJson(
    "/api/auth/login",
    { identifier: "goods@backhaul.test", password: "Demo@123" },
    undefined,
    "goods login",
  );
  let goodsCookie = cookieFrom(goodsLogin.response, undefined);
  const goodsRole = await postJson(
    "/api/auth/session-role",
    { role: "LOADMATE" },
    goodsCookie,
    "goods session role",
  );
  goodsCookie = cookieFrom(goodsRole.response, goodsCookie);
  const goodsSearch = {
    pickup: { name: "Guntur, Andhra Pradesh", lat: 16.3067, lng: 80.4365 },
    drop: { name: "Hyderabad, Telangana", lat: 17.385, lng: 78.4867 },
    departureTime: goodsSearchTime(),
    goodsType: "PARCEL",
    weightKg: 100,
    quantity: 4,
    sizeDescription: "Four parcel sacks",
    isFragile: false,
    requiresColdStorage: false,
    isHeavy: false,
  };
  const goodsMatches = (await postJson("/api/matches/goods", goodsSearch, goodsCookie, "goods match")).json;

  const result = {
    driverRequiresRole: driverLogin.json.requiresRoleSelection,
    driverSessionRole: driverRole.json.sessionRole,
    passengerRequiresRole: passengerLogin.json.requiresRoleSelection,
    passengerSessionRole: passengerRole.json.sessionRole,
    matchesBeforeToggle: before.matches.length,
    toggledOff: off.trip.isLookingForPassengers === false,
    matchesAfterOff: afterOff.matches.length,
    eventName: off.event.name,
    eventRoom: off.event.room,
    toggledOn: on.trip.isLookingForPassengers === true,
    matchesAfterOn: afterOn.matches.length,
    goodsSessionRole: goodsRole.json.sessionRole,
    goodsMatches: goodsMatches.matches.length,
    recommendedVehicle: goodsMatches.recommendedVehicle,
  };

  if (
    result.driverRequiresRole !== true ||
    result.driverSessionRole !== "CAPTAIN" ||
    result.passengerRequiresRole !== true ||
    result.passengerSessionRole !== "ROUTEMATE" ||
    result.matchesBeforeToggle < 1 ||
    !result.toggledOff ||
    result.matchesAfterOff !== 0 ||
    result.eventName !== "availability:update" ||
    !result.eventRoom.startsWith("route:") ||
    !result.toggledOn ||
    result.matchesAfterOn < 1 ||
    result.goodsSessionRole !== "LOADMATE" ||
    result.goodsMatches < 1
  ) {
    throw new Error(`Smoke assertions failed: ${JSON.stringify(result, null, 2)}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main()
  .finally(() => {
    server.kill("SIGTERM");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
