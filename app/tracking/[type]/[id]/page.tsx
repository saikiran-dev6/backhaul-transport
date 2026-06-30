import { TrackingView } from "@/components/TrackingView";export default function Page({params}:{params:{type:string;id:string}}){return <TrackingView type={params.type} id={params.id}/>}
