"use client";

import { useEffect, useState } from "react";

type GpsPoint = { lat: number; lng: number; sentAt: string };

export function useDriverGps(tripId?: string) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [lastPoint, setLastPoint] = useState<GpsPoint | null>(null);

  useEffect(() => {
    if (!tripId) {
      setActive(false);
      setError("");
      setLastPoint(null);
      return;
    }
    if (!("geolocation" in navigator)) {
      setError("GPS is not available in this browser.");
      setActive(false);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    const publish = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;
          const point = { lat: position.coords.latitude, lng: position.coords.longitude, sentAt: new Date().toISOString() };
          try {
            const response = await fetch("/api/driver/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tripId, lat: point.lat, lng: point.lng, status: "DRIVING" }),
            });
            if (!response.ok) throw new Error("Could not publish GPS");
            setLastPoint(point);
            setActive(true);
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not publish GPS");
          }
        },
        () => {
          if (!cancelled) {
            setActive(false);
            setError("Allow location access to stream Captain GPS.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 },
      );
    };

    publish();
    timer = setInterval(publish, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      setActive(false);
    };
  }, [tripId]);

  return { active, error, lastPoint };
}
