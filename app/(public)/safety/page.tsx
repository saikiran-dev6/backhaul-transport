import { ShieldCheck } from "lucide-react";
import { PublicPage } from "@/components/PublicPage";

export default function SafetyPage() {
  return (
    <PublicPage
      eyebrow="Backhaul safety"
      title="Trust is checked before a vehicle is matched."
      copy="Control Hub verification, permit-aware matching, OTP handoffs, live tracking and transparent ratings make each return useful without cutting legal corners."
      cta="Login to access verified matches"
      ctaHref="/login?notice=service_login"
      icon={ShieldCheck}
      features={[
        { title: "Verified Captain", copy: "Driver identity, licence and emergency contact enter a review workflow." },
        { title: "Verified vehicle", copy: "RC, insurance, PUC, permit and fitness documents are tracked separately." },
        { title: "Permit-aware service", copy: "Passenger bookings require passenger permission; goods bookings require goods permission." },
        { title: "OTP handoff", copy: "Pickup and delivery codes provide a simple identity checkpoint." },
        { title: "Live tracking + SOS", copy: "The MVP simulates movement and exposes an immediate SOS action in the tracking UI." },
        { title: "Ratings & complaints", copy: "Feedback and complaint models support ongoing marketplace quality." },
      ]}
    />
  );
}
