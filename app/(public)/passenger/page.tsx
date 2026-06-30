import { Users } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";

export default function PassengerPage() {
  return (
    <PublicPage
      eyebrow="RouteMate / Passenger"
      title="Your route may already have an empty seat."
      copy="Select any pickup and drop on the map after login. Backhaul searches approved passenger-permitted return vehicles by route closeness, seats and departure time."
      cta="Login to book a return seat"
      ctaHref="/login?notice=service_login"
      icon={Users}
      features={[
        { title: "Dynamic route search", copy: "Use current location, place search or map markers. Results come from active trip records." },
        { title: "Permit-safe matches", copy: "Only approved passenger-permitted vehicles with enough seats can appear." },
        { title: "Fixed fare", copy: "See the complete fuel, Captain earning, detour, fee and return-discount breakdown." },
        { title: "Pickup OTP", copy: "Confirm the correct handoff with a six-digit pickup code." },
        { title: "Live tracking", copy: "Follow the Captain position in a simulated real-time MVP view." },
        { title: "History & ratings", copy: "Review bookings and leave feedback from the RouteMate dashboard." },
      ]}
    />
  );
}
