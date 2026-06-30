import { Route } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";

export default function HowPage() {
  return (
    <PublicPage
      eyebrow="How Backhaul works"
      title="Coordinates in. Useful return matches out."
      copy="Captains create trips from map coordinates. RouteMates and LoadMates submit their own route. The engine projects both points onto every eligible stored trip, checks direction and detour, then calculates a fixed price."
      cta="Login to try a route"
      ctaHref="/login?notice=service_login"
      icon={Route}
      features={[
        { title: "1. Login or register", copy: "Start with a RouteMate, LoadMate, Backhaul Captain, Merchant or Control Hub account." },
        { title: "2. Select", copy: "Search OpenStreetMap, use your location, or tap markers for pickup and drop." },
        { title: "3. Describe", copy: "Add departure, seats and luggage — or goods type, weight, size and handling." },
        { title: "4. Match", copy: "Database trips are filtered by time, proximity, direction, capacity, permit and rules." },
        { title: "5. Price", copy: "Vehicle-specific pricing is calculated from distance, fuel, weight and detour." },
        { title: "6. Track and rate", copy: "Use OTPs and follow the trip through pickup, movement, delivery and rating." },
      ]}
    />
  );
}
