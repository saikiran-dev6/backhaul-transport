import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type Role = "ROUTEMATE" | "LOADMATE" | "CAPTAIN" | "MERCHANT" | "ADMIN";
type LocationKey = keyof typeof locations;

const locations = {
  hyderabad: { name: "Hyderabad, Telangana", lat: 17.385, lng: 78.4867 },
  lbNagar: { name: "LB Nagar, Hyderabad", lat: 17.3457, lng: 78.5522 },
  srisailam: { name: "Srisailam, Andhra Pradesh", lat: 16.0728, lng: 78.8686 },
  nalgonda: { name: "Nalgonda, Telangana", lat: 17.0575, lng: 79.2684 },
  warangal: { name: "Warangal, Telangana", lat: 17.9689, lng: 79.5941 },
  vijayawada: { name: "Vijayawada, Andhra Pradesh", lat: 16.5062, lng: 80.648 },
  kurnool: { name: "Kurnool, Andhra Pradesh", lat: 15.8281, lng: 78.0373 },
  karimnagar: { name: "Karimnagar, Telangana", lat: 18.4386, lng: 79.1288 },
  guntur: { name: "Guntur, Andhra Pradesh", lat: 16.3067, lng: 80.4365 },
  khammam: { name: "Khammam, Telangana", lat: 17.2473, lng: 80.1514 },
  suryapet: { name: "Suryapet, Telangana", lat: 17.1402, lng: 79.6207 },
  medak: { name: "Medak, Telangana", lat: 18.0453, lng: 78.2608 },
  siddipet: { name: "Siddipet, Telangana", lat: 18.1018, lng: 78.852 },
  miryalaguda: { name: "Miryalaguda, Telangana", lat: 16.8722, lng: 79.5625 },
  bhongir: { name: "Bhongir, Telangana", lat: 17.515, lng: 78.8856 },
  amaravati: { name: "Amaravati, Andhra Pradesh", lat: 16.573, lng: 80.3575 },
  tenali: { name: "Tenali, Andhra Pradesh", lat: 16.243, lng: 80.64 },
  zaheerabad: { name: "Zaheerabad Market, Telangana", lat: 17.6814, lng: 77.6169 },
  chilkur: { name: "Chilkur Village, Telangana", lat: 17.3334, lng: 78.306 },
  kodad: { name: "Kodad, Telangana", lat: 16.9951, lng: 79.9738 },
};

const routeDistances: Record<string, number> = {
  "hyderabad-srisailam": 213,
  "srisailam-hyderabad": 213,
  "nalgonda-hyderabad": 105,
  "hyderabad-nalgonda": 105,
  "warangal-hyderabad": 148,
  "hyderabad-warangal": 148,
  "vijayawada-hyderabad": 274,
  "hyderabad-vijayawada": 274,
  "kurnool-hyderabad": 213,
  "hyderabad-kurnool": 213,
  "karimnagar-hyderabad": 165,
  "hyderabad-karimnagar": 165,
  "guntur-vijayawada": 36,
  "vijayawada-guntur": 36,
  "khammam-hyderabad": 194,
  "hyderabad-khammam": 194,
  "guntur-hyderabad": 270,
  "suryapet-hyderabad": 135,
  "hyderabad-suryapet": 135,
  "medak-hyderabad": 98,
  "siddipet-hyderabad": 103,
  "miryalaguda-hyderabad": 145,
  "bhongir-hyderabad": 52,
  "amaravati-vijayawada": 39,
  "tenali-vijayawada": 38,
  "zaheerabad-hyderabad": 111,
  "chilkur-hyderabad": 31,
  "kodad-hyderabad": 178,
};

const passengerStatuses = ["SEARCHING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const goodsCatalog = [
  { type: "AGRICULTURE", label: "rice bags", weight: 320, quantity: 16, size: "16 stitched rice bags", heavy: true },
  { type: "VEGETABLES", label: "vegetable crates", weight: 180, quantity: 18, size: "18 stackable crates" },
  { type: "FRUITS", label: "fruit boxes", weight: 140, quantity: 14, size: "14 ventilated fruit boxes", fragile: true },
  { type: "POULTRY", label: "poultry boxes", weight: 220, quantity: 12, size: "12 poultry boxes" },
  { type: "MILK", label: "milk cans", weight: 160, quantity: 10, size: "10 sealed milk cans", cold: true },
  { type: "FERTILIZER", label: "fertilizer bags", weight: 500, quantity: 20, size: "20 fertilizer bags", heavy: true },
  { type: "SEEDS", label: "seed packets", weight: 90, quantity: 30, size: "30 seed cartons" },
  { type: "GROCERIES", label: "grocery cartons", weight: 260, quantity: 22, size: "22 grocery cartons" },
  { type: "FURNITURE", label: "furniture", weight: 420, quantity: 5, size: "5 packed furniture items", heavy: true },
  { type: "SPARE_PARTS", label: "spare parts", weight: 210, quantity: 9, size: "9 spare part crates" },
  { type: "CEMENT", label: "cement bags", weight: 650, quantity: 25, size: "25 cement bags", heavy: true },
  { type: "MEDICINE", label: "medicine boxes", weight: 70, quantity: 8, size: "8 medicine boxes", cold: true, fragile: true },
  { type: "EVENT", label: "event material", weight: 310, quantity: 11, size: "11 event material bundles" },
  { type: "TEXTILES", label: "textile bundles", weight: 190, quantity: 15, size: "15 textile bundles" },
  { type: "BOXES", label: "retail boxes", weight: 240, quantity: 20, size: "20 retail boxes" },
  { type: "PARCEL", label: "parcel sacks", weight: 95, quantity: 9, size: "9 parcel sacks" },
];

function roles(...roles: Role[]) {
  return roles;
}

function tripTime(daysFromNow: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function distance(from: LocationKey, to: LocationKey) {
  return routeDistances[`${from}-${to}`] || 120;
}

function polyline(from: LocationKey, to: LocationKey) {
  const start = locations[from];
  const end = locations[to];
  return JSON.stringify([[start.lat, start.lng], [end.lat, end.lng]]);
}

async function setTripGeo(id: string, fromLng: number, fromLat: number, toLng: number, toLat: number) {
  await prisma.$executeRaw`
    UPDATE "ReturnTrip"
    SET
      "fromGeo" = ST_SetSRID(ST_MakePoint(${fromLng}, ${fromLat}), 4326)::geography,
      "toGeo" = ST_SetSRID(ST_MakePoint(${toLng}, ${toLat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}

async function setPassengerGeo(id: string, pickupLng: number, pickupLat: number, dropLng: number, dropLat: number) {
  await prisma.$executeRaw`
    UPDATE "PassengerBooking"
    SET
      "pickupGeo" = ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography,
      "dropGeo" = ST_SetSRID(ST_MakePoint(${dropLng}, ${dropLat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}

async function setGoodsRequestGeo(id: string, pickupLng: number, pickupLat: number, dropLng: number, dropLat: number) {
  await prisma.$executeRaw`
    UPDATE "GoodsRequest"
    SET
      "pickupGeo" = ST_SetSRID(ST_MakePoint(${pickupLng}, ${pickupLat}), 4326)::geography,
      "dropGeo" = ST_SetSRID(ST_MakePoint(${dropLng}, ${dropLat}), 4326)::geography
    WHERE "id" = ${id}
  `;
}

async function createUser(input: {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  role: Role;
  roles?: Role[];
  language?: string;
  passwordHash: string;
}) {
  return prisma.user.create({
    data: {
      fullName: input.fullName,
      username: input.username,
      phone: input.phone,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      role: input.role,
      roles: roles(...(input.roles || [input.role])),
      language: input.language || "en",
      otpVerified: true,
    },
  });
}

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
      { vehicleType: "HATCHBACK", fuelPrice: 105, baseFarePerKm: 10, platformFeePercent: 8, minimumFare: 120, seatDiscountPercent: 18, goodsWeightRate: 1.2, driverBaseEarning: 130, detourRatePerKm: 12 },
      { vehicleType: "SEDAN", fuelPrice: 105, baseFarePerKm: 11, platformFeePercent: 8, minimumFare: 140, seatDiscountPercent: 17, goodsWeightRate: 1.3, driverBaseEarning: 145, detourRatePerKm: 14 },
      { vehicleType: "SUV", fuelPrice: 105, baseFarePerKm: 13, platformFeePercent: 9, minimumFare: 180, seatDiscountPercent: 14, goodsWeightRate: 1.4, driverBaseEarning: 180, detourRatePerKm: 16 },
      { vehicleType: "TEMPO_TRAVELLER", fuelPrice: 96, baseFarePerKm: 16, platformFeePercent: 9, minimumFare: 260, seatDiscountPercent: 12, goodsWeightRate: 1.1, driverBaseEarning: 260, detourRatePerKm: 18 },
      { vehicleType: "AUTO", fuelPrice: 105, baseFarePerKm: 9, platformFeePercent: 8, minimumFare: 90, seatDiscountPercent: 10, goodsWeightRate: 1.0, driverBaseEarning: 90, detourRatePerKm: 10 },
      { vehicleType: "GOODS_AUTO", fuelPrice: 105, baseFarePerKm: 10, platformFeePercent: 8, minimumFare: 160, seatDiscountPercent: 0, goodsWeightRate: 1.1, driverBaseEarning: 130, detourRatePerKm: 13 },
      { vehicleType: "TATA_ACE", fuelPrice: 96, baseFarePerKm: 13, platformFeePercent: 9, minimumFare: 220, seatDiscountPercent: 0, goodsWeightRate: 1.25, driverBaseEarning: 210, detourRatePerKm: 16 },
      { vehicleType: "PICKUP", fuelPrice: 96, baseFarePerKm: 15, platformFeePercent: 9, minimumFare: 250, seatDiscountPercent: 0, goodsWeightRate: 1.3, driverBaseEarning: 240, detourRatePerKm: 19 },
      { vehicleType: "MINI_TRUCK", fuelPrice: 96, baseFarePerKm: 19, platformFeePercent: 10, minimumFare: 400, seatDiscountPercent: 0, goodsWeightRate: 1.5, driverBaseEarning: 350, detourRatePerKm: 24 },
      { vehicleType: "VAN", fuelPrice: 96, baseFarePerKm: 14, platformFeePercent: 9, minimumFare: 220, seatDiscountPercent: 8, goodsWeightRate: 1.15, driverBaseEarning: 220, detourRatePerKm: 18 },
      { vehicleType: "CAR", fuelPrice: 105, baseFarePerKm: 11, platformFeePercent: 8, minimumFare: 130, seatDiscountPercent: 18, goodsWeightRate: 1.4, driverBaseEarning: 140, detourRatePerKm: 14 },
    ],
  });

  const passengerNames = ["Ananya Rao", "Meera Sharma", "Kiran Reddy", "Sahithi N", "Rahul Varma", "Priya Menon", "Nikhil Goud", "Ayesha Khan", "Vamshi Krishna", "Deepika Naidu"];
  const loadMateNames = ["Ravi Traders", "Naveen Kirana", "Bhavani Dairy", "Kakatiya Seeds", "Sai Fertilizers", "Lakshmi Vegetables", "Deccan Hardware", "Amaravati Textiles", "Suryapet Pharma", "Medak Events"];
  const merchantNames = ["Sri Lakshmi Wholesale", "Telangana Fresh Supply", "Andhra Market Link", "Deccan Retail Hub"];
  const captainNames = ["Arjun Reddy", "Suresh Kumar", "Ramesh Yadav", "Mahesh Naik", "Farooq Ali", "Koteswara Rao", "Naveen Goud", "Satish Babu"];

  const passengers = [];
  for (let index = 0; index < passengerNames.length; index += 1) {
    passengers.push(await createUser({
      fullName: passengerNames[index],
      username: index === 0 ? "ananya_route" : `routemate_${index + 1}`,
      phone: `98765100${String(index + 1).padStart(2, "0")}`,
      email: index === 0 ? "passenger@backhaul.test" : `passenger${index + 1}@backhaul.test`,
      role: "ROUTEMATE",
      language: index % 3 === 0 ? "te" : "en",
      passwordHash,
    }));
  }

  const loadMates = [];
  for (let index = 0; index < loadMateNames.length; index += 1) {
    loadMates.push(await createUser({
      fullName: loadMateNames[index],
      username: index === 0 ? "ravi_loads" : `loadmate_${index + 1}`,
      phone: `98765200${String(index + 1).padStart(2, "0")}`,
      email: index === 0 ? "goods@backhaul.test" : `goods${index + 1}@backhaul.test`,
      role: "LOADMATE",
      language: index % 2 ? "en" : "te",
      passwordHash,
    }));
  }

  const merchants = [];
  for (let index = 0; index < merchantNames.length; index += 1) {
    merchants.push(await createUser({
      fullName: merchantNames[index],
      username: index === 0 ? "lakshmi_merchant" : `merchant_${index + 1}`,
      phone: `98765300${String(index + 1).padStart(2, "0")}`,
      email: index === 0 ? "merchant@backhaul.test" : `merchant${index + 1}@backhaul.test`,
      role: "MERCHANT",
      language: "en",
      passwordHash,
    }));
  }

  const admins = [];
  const adminNames = ["Backhaul Control Hub", "Ops Admin Kavya"];
  for (let index = 0; index < adminNames.length; index += 1) {
    const name = adminNames[index];
    admins.push(await createUser({
      fullName: name,
      username: index === 0 ? "control_hub" : "ops_admin_kavya",
      phone: `98765400${String(index + 1).padStart(2, "0")}`,
      email: index === 0 ? "admin@backhaul.test" : "admin2@backhaul.test",
      role: "ADMIN",
      language: "en",
      passwordHash,
    }));
  }

  const captains = [];
  for (let index = 0; index < captainNames.length; index += 1) {
    const user = await createUser({
      fullName: captainNames[index],
      username: index === 0 ? "captain_arjun" : index === 1 ? "captain_suresh" : `captain_${index + 1}`,
      phone: `98765500${String(index + 1).padStart(2, "0")}`,
      email: index === 0 ? "driver@backhaul.test" : index === 1 ? "truck@backhaul.test" : `captain${index + 1}@backhaul.test`,
      role: "CAPTAIN",
      language: index % 2 ? "hi" : "te",
      passwordHash,
    });
    const verificationStatus = index < 5 ? "APPROVED" : index < 7 ? "PENDING" : "REJECTED";
    const profile = await prisma.driverProfile.create({
      data: {
        userId: user.id,
        licenseNumber: `DL-TG-202${index}-${4100 + index}`,
        profilePhoto: `/images/captains/captain-${index + 1}.svg`,
        verificationStatus,
        rating: Number((4.2 + Math.min(index, 5) * 0.12).toFixed(1)),
        totalTrips: 20 + index * 17,
        emergencyContact: `98765600${String(index + 1).padStart(2, "0")}`,
        bankUpiDetails: `captain${index + 1}@upi`,
      },
    });
    captains.push({ user, profile });
  }

  const vehicleInputs = [
    { captain: 0, number: "TS09AB4172", type: "SEDAN", permit: "PASSENGER", seats: 4, kg: 25, fuel: "PETROL", mileage: 17, status: "APPROVED" },
    { captain: 1, number: "AP16TK8831", type: "PICKUP", permit: "GOODS", seats: 0, kg: 900, fuel: "DIESEL", mileage: 13, status: "APPROVED" },
    { captain: 2, number: "TS10CD2244", type: "HATCHBACK", permit: "PASSENGER", seats: 4, kg: 20, fuel: "PETROL", mileage: 19, status: "APPROVED" },
    { captain: 2, number: "TS10EF8844", type: "GOODS_AUTO", permit: "GOODS", seats: 0, kg: 450, fuel: "CNG", mileage: 22, status: "APPROVED" },
    { captain: 3, number: "AP39GH7721", type: "SUV", permit: "BOTH", seats: 6, kg: 180, fuel: "DIESEL", mileage: 13, status: "APPROVED" },
    { captain: 3, number: "AP39JK1099", type: "TATA_ACE", permit: "GOODS", seats: 0, kg: 750, fuel: "DIESEL", mileage: 15, status: "APPROVED" },
    { captain: 4, number: "TS05LM5490", type: "TEMPO_TRAVELLER", permit: "PASSENGER", seats: 12, kg: 80, fuel: "DIESEL", mileage: 11, status: "APPROVED" },
    { captain: 4, number: "TS05MN7640", type: "MINI_TRUCK", permit: "GOODS", seats: 0, kg: 1500, fuel: "DIESEL", mileage: 9, status: "APPROVED" },
    { captain: 5, number: "AP07PQ3321", type: "AUTO", permit: "BOTH", seats: 3, kg: 80, fuel: "CNG", mileage: 25, status: "PENDING" },
    { captain: 6, number: "TS22RS9001", type: "VAN", permit: "BOTH", seats: 8, kg: 600, fuel: "DIESEL", mileage: 12, status: "PENDING" },
    { captain: 7, number: "AP21TU4567", type: "MINI_TRUCK", permit: "GOODS", seats: 0, kg: 1600, fuel: "DIESEL", mileage: 8, status: "REJECTED" },
  ];

  const vehicles = [];
  for (const input of vehicleInputs) {
    vehicles.push(await prisma.vehicle.create({
      data: {
        driverId: captains[input.captain].profile.id,
        vehicleNumber: input.number,
        vehicleType: input.type,
        permitType: input.permit,
        passengerCapacity: input.seats,
        goodsCapacityKg: input.kg,
        fuelType: input.fuel,
        mileageKmPerLiter: input.mileage,
        insuranceStatus: input.status,
        pucStatus: input.status,
        fitnessStatus: input.status,
        verificationStatus: input.status,
      },
    }));
  }

  for (let index = 0; index < captains.length; index += 1) {
    const captain = captains[index];
    await prisma.driverDocument.create({
      data: {
        driverId: captain.profile.id,
        documentType: "DRIVER_LICENSE",
        fileUrl: `/uploads/demo/license-${index + 1}.pdf`,
        status: captain.profile.verificationStatus,
        rejectionReason: captain.profile.verificationStatus === "REJECTED" ? "Blurry document image" : undefined,
      },
    });
  }

  const tripInputs: Array<{ vehicle: number; from: LocationKey; to: LocationKey; day: number; hour: number; seats: number; kg: number; detour: number; goods: string[]; status?: string }> = [
    { vehicle: 0, from: "hyderabad", to: "srisailam", day: 1, hour: 9, seats: 3, kg: 0, detour: 12, goods: [] },
    { vehicle: 0, from: "srisailam", to: "hyderabad", day: 3, hour: 16, seats: 2, kg: 0, detour: 12, goods: [] },
    { vehicle: 2, from: "nalgonda", to: "hyderabad", day: 1, hour: 8, seats: 3, kg: 0, detour: 10, goods: [] },
    { vehicle: 2, from: "hyderabad", to: "nalgonda", day: 2, hour: 18, seats: 2, kg: 0, detour: 10, goods: [] },
    { vehicle: 4, from: "warangal", to: "hyderabad", day: 1, hour: 6, seats: 5, kg: 80, detour: 18, goods: ["PARCEL", "BOXES"] },
    { vehicle: 4, from: "hyderabad", to: "warangal", day: 2, hour: 15, seats: 4, kg: 120, detour: 18, goods: ["PARCEL", "BOXES"] },
    { vehicle: 6, from: "vijayawada", to: "hyderabad", day: 2, hour: 7, seats: 10, kg: 0, detour: 20, goods: [] },
    { vehicle: 6, from: "hyderabad", to: "vijayawada", day: 4, hour: 13, seats: 8, kg: 0, detour: 20, goods: [] },
    { vehicle: 5, from: "kurnool", to: "hyderabad", day: 1, hour: 11, seats: 0, kg: 620, detour: 28, goods: ["CEMENT", "FERTILIZER", "AGRICULTURE"] },
    { vehicle: 5, from: "hyderabad", to: "kurnool", day: 3, hour: 5, seats: 0, kg: 580, detour: 28, goods: ["CEMENT", "FERTILIZER", "AGRICULTURE"] },
    { vehicle: 3, from: "karimnagar", to: "hyderabad", day: 1, hour: 10, seats: 0, kg: 360, detour: 20, goods: ["VEGETABLES", "FRUITS", "GROCERIES"] },
    { vehicle: 3, from: "hyderabad", to: "karimnagar", day: 3, hour: 17, seats: 0, kg: 320, detour: 20, goods: ["VEGETABLES", "FRUITS", "GROCERIES"] },
    { vehicle: 1, from: "guntur", to: "vijayawada", day: 1, hour: 7, seats: 0, kg: 700, detour: 15, goods: ["VEGETABLES", "FRUITS", "TEXTILES"] },
    { vehicle: 1, from: "vijayawada", to: "guntur", day: 1, hour: 20, seats: 0, kg: 650, detour: 15, goods: ["VEGETABLES", "FRUITS", "TEXTILES"] },
    { vehicle: 7, from: "khammam", to: "hyderabad", day: 2, hour: 5, seats: 0, kg: 1200, detour: 32, goods: ["CEMENT", "SPARE_PARTS", "FURNITURE"] },
    { vehicle: 7, from: "hyderabad", to: "khammam", day: 4, hour: 6, seats: 0, kg: 1300, detour: 32, goods: ["CEMENT", "SPARE_PARTS", "FURNITURE"] },
    { vehicle: 1, from: "guntur", to: "hyderabad", day: 2, hour: 7, seats: 0, kg: 750, detour: 30, goods: ["PARCEL", "GROCERIES", "BOXES", "FURNITURE", "AGRICULTURE"] },
    { vehicle: 3, from: "suryapet", to: "hyderabad", day: 2, hour: 9, seats: 0, kg: 390, detour: 20, goods: ["MILK", "MEDICINE", "GROCERIES"] },
    { vehicle: 4, from: "hyderabad", to: "suryapet", day: 3, hour: 18, seats: 5, kg: 100, detour: 18, goods: ["PARCEL", "BOXES"] },
    { vehicle: 2, from: "medak", to: "hyderabad", day: 2, hour: 8, seats: 3, kg: 0, detour: 10, goods: [] },
    { vehicle: 4, from: "siddipet", to: "hyderabad", day: 2, hour: 12, seats: 4, kg: 100, detour: 18, goods: ["PARCEL"] },
    { vehicle: 1, from: "miryalaguda", to: "hyderabad", day: 3, hour: 6, seats: 0, kg: 760, detour: 26, goods: ["AGRICULTURE", "FERTILIZER"] },
    { vehicle: 2, from: "bhongir", to: "hyderabad", day: 1, hour: 19, seats: 3, kg: 0, detour: 8, goods: [] },
    { vehicle: 3, from: "amaravati", to: "vijayawada", day: 2, hour: 11, seats: 0, kg: 340, detour: 12, goods: ["TEXTILES", "BOXES"] },
    { vehicle: 1, from: "tenali", to: "vijayawada", day: 3, hour: 10, seats: 0, kg: 680, detour: 12, goods: ["VEGETABLES", "FRUITS"] },
    { vehicle: 7, from: "zaheerabad", to: "hyderabad", day: 5, hour: 5, seats: 0, kg: 1100, detour: 30, goods: ["SPARE_PARTS", "CEMENT"] },
    { vehicle: 4, from: "chilkur", to: "hyderabad", day: 1, hour: 21, seats: 5, kg: 60, detour: 8, goods: ["PARCEL"] },
    { vehicle: 1, from: "kodad", to: "hyderabad", day: 4, hour: 8, seats: 0, kg: 720, detour: 28, goods: ["AGRICULTURE", "GROCERIES"] },
  ];

  const trips = [];
  for (const input of tripInputs) {
    const vehicle = vehicles[input.vehicle];
    const dist = distance(input.from, input.to);
    const trip = await prisma.returnTrip.create({
      data: {
        driverId: vehicle.driverId,
        vehicleId: vehicle.id,
        fromLocationName: locations[input.from].name,
        fromLat: locations[input.from].lat,
        fromLng: locations[input.from].lng,
        toLocationName: locations[input.to].name,
        toLat: locations[input.to].lat,
        toLng: locations[input.to].lng,
        routeDistanceKm: dist,
        estimatedDurationMin: Math.round((dist / 52) * 60),
        routePolyline: polyline(input.from, input.to),
        departureTime: tripTime(input.day, input.hour, input.from === "hyderabad" && input.to === "srisailam" ? 30 : 0),
        availableSeats: input.seats,
        availableGoodsCapacityKg: input.kg,
        maxDetourKm: input.detour,
        allowedGoodsTypes: JSON.stringify(input.goods),
        fixedBasePrice: input.seats ? 300 : 700,
        isLookingForPassengers: input.seats > 0 && ["PASSENGER", "BOTH"].includes(vehicle.permitType),
        isLookingForGoods: input.kg > 0 && ["GOODS", "BOTH"].includes(vehicle.permitType),
        status: input.status || "ACTIVE",
      },
    });
    await setTripGeo(trip.id, locations[input.from].lng, locations[input.from].lat, locations[input.to].lng, locations[input.to].lat);
    trips.push(trip);
  }

  const passengerTrips = trips.filter((trip) => trip.availableSeats > 0);
  for (let index = 0; index < 30; index += 1) {
    const trip = passengerTrips[index % passengerTrips.length];
    const passenger = passengers[index % passengers.length];
    const status = passengerStatuses[index % passengerStatuses.length];
    const fare = 220 + (index % 8) * 55;
    const booking = await prisma.passengerBooking.create({
      data: {
        tripId: trip.id,
        passengerId: passenger.id,
        seatsBooked: index % 7 === 0 ? 2 : 1,
        pickupName: index === 0 ? locations.lbNagar.name : trip.fromLocationName,
        pickupLat: index === 0 ? locations.lbNagar.lat : trip.fromLat,
        pickupLng: index === 0 ? locations.lbNagar.lng : trip.fromLng,
        dropName: trip.toLocationName,
        dropLat: trip.toLat,
        dropLng: trip.toLng,
        fare,
        pickupOtp: String(340000 + index),
        bookingStatus: status,
        paymentStatus: status === "CANCELLED" ? "FAILED" : status === "SEARCHING" ? "PENDING" : "PAID",
        isLookingForRide: status === "SEARCHING",
      },
    });
    await setPassengerGeo(booking.id, booking.pickupLng, booking.pickupLat, booking.dropLng, booking.dropLat);
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        bookingType: "PASSENGER",
        amount: fare,
        platformFee: Number((fare * 0.08).toFixed(2)),
        driverEarning: Number((fare * 0.92).toFixed(2)),
        method: index % 4 === 0 ? "CASH" : "ONLINE",
        status: status === "CANCELLED" ? "FAILED" : status === "SEARCHING" ? "PENDING" : "PAID",
      },
    });
  }

  const requestRoutes: Array<[LocationKey, LocationKey]> = [
    ["guntur", "hyderabad"], ["vijayawada", "hyderabad"], ["karimnagar", "hyderabad"], ["khammam", "hyderabad"], ["guntur", "vijayawada"],
    ["vijayawada", "guntur"], ["miryalaguda", "hyderabad"], ["suryapet", "hyderabad"], ["hyderabad", "suryapet"], ["hyderabad", "khammam"],
    ["tenali", "vijayawada"], ["amaravati", "vijayawada"], ["zaheerabad", "hyderabad"], ["kodad", "hyderabad"], ["hyderabad", "karimnagar"],
  ];
  const goodsRequests = [];
  for (let index = 0; index < 35; index += 1) {
    const item = goodsCatalog[index % goodsCatalog.length];
    const [from, to] = requestRoutes[index % requestRoutes.length];
    const senderPool = index % 4 === 0 ? merchants : loadMates;
    const sender = senderPool[index % senderPool.length];
    const request = await prisma.goodsRequest.create({
      data: {
        senderId: sender.id,
        pickupName: locations[from].name,
        pickupLat: locations[from].lat,
        pickupLng: locations[from].lng,
        dropName: locations[to].name,
        dropLat: locations[to].lat,
        dropLng: locations[to].lng,
        goodsType: item.type,
        weightKg: item.weight,
        quantity: item.quantity,
        sizeDescription: item.size,
        imageUrl: `/uploads/demo/goods-${index + 1}.jpg`,
        isFragile: Boolean(item.fragile),
        requiresColdStorage: Boolean(item.cold),
        isHeavy: Boolean(item.heavy),
        status: index < 25 ? "BOOKED" : index % 3 === 0 ? "MATCHING" : "OPEN",
      },
    });
    await setGoodsRequestGeo(request.id, request.pickupLng, request.pickupLat, request.dropLng, request.dropLat);
    goodsRequests.push(request);
  }

  const goodsTrips = trips.filter((trip) => trip.availableGoodsCapacityKg > 0);
  for (let index = 0; index < 25; index += 1) {
    const request = goodsRequests[index];
    const trip = goodsTrips[index % goodsTrips.length];
    const price = 850 + (index % 10) * 145;
    const deliveryStatus = index % 5 === 0 ? "DELIVERED" : index % 5 === 1 ? "IN_TRANSIT" : "PENDING";
    const booking = await prisma.goodsBooking.create({
      data: {
        goodsRequestId: request.id,
        tripId: trip.id,
        price,
        pickupOtp: String(550000 + index),
        deliveryOtp: String(660000 + index),
        pickupStatus: deliveryStatus === "PENDING" ? "PENDING" : "PICKED_UP",
        deliveryStatus,
        deliveryProofUrl: deliveryStatus === "DELIVERED" ? `/uploads/demo/proof-${index + 1}.jpg` : undefined,
        paymentStatus: index % 4 === 0 ? "PENDING" : "PAID",
      },
    });
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        bookingType: "GOODS",
        amount: price,
        platformFee: Number((price * 0.09).toFixed(2)),
        driverEarning: Number((price * 0.91).toFixed(2)),
        method: index % 4 === 0 ? "CASH" : "ONLINE",
        status: index % 4 === 0 ? "PENDING" : "PAID",
      },
    });
  }

  const completedTrips = passengerTrips.slice(0, 15);
  for (let index = 0; index < 15; index += 1) {
    const trip = completedTrips[index % completedTrips.length];
    const driver = captains.find((captain) => captain.profile.id === trip.driverId);
    await prisma.rating.create({
      data: {
        fromUserId: passengers[index % passengers.length].id,
        toUserId: driver?.user.id || captains[0].user.id,
        tripId: trip.id,
        rating: 4 + (index % 2),
        comment: index % 3 === 0 ? "Clean ride and clear pickup updates." : "Good return-trip value.",
      },
    });
  }

  const complaintTypes = ["LATE_PICKUP", "VEHICLE_NOT_ARRIVED", "GOODS_HANDLING", "WRONG_DROP_LOCATION", "CANCELLATION", "PAYMENT_ISSUE", "OTP_ISSUE", "SUPPORT_DELAY"];
  for (let index = 0; index < 8; index += 1) {
    await prisma.complaint.create({
      data: {
        userId: index % 2 ? loadMates[index % loadMates.length].id : passengers[index % passengers.length].id,
        tripId: trips[index % trips.length].id,
        complaintType: complaintTypes[index],
        description: [
          "Captain reached pickup point late by 25 minutes.",
          "Vehicle did not arrive at the promised time.",
          "Vegetable crates were not handled carefully.",
          "Drop location needed manual correction.",
          "Cancellation refund was unclear.",
          "UPI confirmation took too long.",
          "OTP had to be rechecked at pickup.",
          "Support callback was delayed.",
        ][index],
        status: index < 3 ? "OPEN" : index < 6 ? "IN_REVIEW" : "RESOLVED",
      },
    });
  }

  console.log("Backhaul realistic demo data seeded. Password for all demo users: Demo@123");
  console.log("Demo logins: passenger@backhaul.test, goods@backhaul.test, merchant@backhaul.test, driver@backhaul.test, truck@backhaul.test, admin@backhaul.test");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
