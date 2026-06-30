import { Boxes } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";

export default function GoodsPage() {
  return (
    <PublicPage
      eyebrow="LoadMate / Goods sender"
      title="Send goods in space already coming back."
      copy="Backhaul finds goods-permitted return vehicles whose routes pass near your pickup and drop within each Captain’s allowed detour."
      cta="Login to match goods space"
      ctaHref="/login?notice=service_login"
      icon={Boxes}
      features={[
        { title: "Nearby-route matching", copy: "Exact destinations are not required; route projection checks both points and travel direction." },
        { title: "Vehicle suggestion", copy: "Weight and size rules suggest bike, goods auto, pickup, van or mini truck." },
        { title: "Capacity + permit checks", copy: "Matches require remaining kg capacity, allowed goods type and a legal goods permit." },
        { title: "Photo upload", copy: "Attach a goods image through local MVP storage, ready for Cloudinary later." },
        { title: "Two OTPs", copy: "Separate pickup and delivery OTPs protect both ends of the handoff." },
        { title: "Delivery proof", copy: "The booking data model and dashboard support proof-photo status." },
      ]}
    />
  );
}
