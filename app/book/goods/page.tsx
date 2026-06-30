import { GoodsBookingFlow } from "@/components/GoodsBookingFlow";
export const metadata={title:"Send Goods"};
export default function BookGoods(){return <div className="page-shell section-pad"><div className="mb-9 max-w-3xl"><span className="eyebrow">LoadMate booking</span><h1 className="display-title">Match your load to nearby return space.</h1><p className="body-copy mt-4">The matching engine accepts nearby destinations when both points fall on the route in order and within the Captain’s detour limit.</p></div><GoodsBookingFlow/></div>}
