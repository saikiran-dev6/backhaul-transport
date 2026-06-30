import { Truck } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";

export default function DriverPage() {
  return (
    <PublicPage
      eyebrow="Backhaul Captain / Vehicle owner"
      title="Make the return trip earn its way home."
      copy="Register your vehicle and documents, get Control Hub approval, then post any return route with seats, goods capacity and detour rules."
      cta="Create Captain account"
      ctaHref="/register?role=CAPTAIN"
      icon={Truck}
      features={[
        { title: "Dynamic trip posting", copy: "Pick any two map points, departure time, capacity and flexibility — no predefined route list." },
        { title: "Document verification", copy: "Upload licence, RC, insurance, PUC, permit, fitness and vehicle photos." },
        { title: "Legal matching", copy: "Passenger and goods requests are separated by the approved permit on each vehicle." },
        { title: "Request visibility", copy: "See passenger and goods bookings grouped under your posted trips." },
        { title: "Live trip controls", copy: "Active trip data is ready for start, tracking and completion states." },
        { title: "Earnings dashboard", copy: "Captain earnings are summed from dynamic passenger and goods payments." },
      ]}
    />
  );
}
