import { PassengerBookingFlow } from "@/components/PassengerBookingFlow";
export const metadata={title:"Book a Return Seat"};
export default function BookPassenger(){return <div className="page-shell section-pad"><div className="mb-9 max-w-3xl"><span className="eyebrow">RouteMate booking</span><h1 className="display-title">Find a seat already coming your way.</h1><p className="body-copy mt-4">Choose any route. The engine checks stored active trips, time, route proximity, travel direction, passenger permits and available seats.</p></div><PassengerBookingFlow/></div>}
