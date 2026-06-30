"use client";

import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import type { LocationPoint } from "@/types";

type Props = { pickup?: LocationPoint; drop?: LocationPoint; active: "pickup" | "drop"; vehicles?: Array<LocationPoint & { label?: string }>; onPick: (type: "pickup" | "drop", point: LocationPoint) => void };

function Events({ active, onPick }: Pick<Props, "active" | "onPick">) {
  useMapEvents({ click(event) { onPick(active, { name: active === "pickup" ? "Selected pickup" : "Selected drop", lat: event.latlng.lat, lng: event.latlng.lng }); } });
  return null;
}

function Fit({ pickup, drop }: Pick<Props, "pickup" | "drop">) {
  const map = useMap();
  useEffect(() => { if (pickup && drop) map.fitBounds([[pickup.lat, pickup.lng], [drop.lat, drop.lng]], { padding: [40, 40] }); else if (pickup) map.setView([pickup.lat, pickup.lng], 11); }, [pickup, drop, map]);
  return null;
}

export default function LeafletMap({ pickup, drop, active, vehicles = [], onPick }: Props) {
  const route = pickup && drop ? [[pickup.lat, pickup.lng], [drop.lat, drop.lng]] as [number, number][] : [];
  return <MapContainer center={[17.385, 78.4867]} zoom={7} scrollWheelZoom className="z-0">
    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Events active={active} onPick={onPick} /><Fit pickup={pickup} drop={drop} />
    {pickup && <CircleMarker center={[pickup.lat, pickup.lng]} radius={9} pathOptions={{ color: "#0d6fc2", fillColor: "#1783dd", fillOpacity: 1 }}><Popup>{pickup.name}</Popup></CircleMarker>}
    {drop && <CircleMarker center={[drop.lat, drop.lng]} radius={9} pathOptions={{ color: "#137146", fillColor: "#20a96b", fillOpacity: 1 }}><Popup>{drop.name}</Popup></CircleMarker>}
    {route.length > 0 && <Polyline positions={route} pathOptions={{ color: "#1783dd", weight: 5, opacity: .75, dashArray: "10 10" }} />}
    {vehicles.map((vehicle, index) => <CircleMarker key={`${vehicle.lat}-${vehicle.lng}-${index}`} center={[vehicle.lat, vehicle.lng]} radius={7} pathOptions={{ color: "#b86c00", fillColor: "#ffb52e", fillOpacity: 1 }}><Popup>{vehicle.label || vehicle.name}</Popup></CircleMarker>)}
  </MapContainer>;
}
