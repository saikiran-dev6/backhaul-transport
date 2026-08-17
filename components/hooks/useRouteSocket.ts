"use client";

import { useEffect } from "react";
import type { LocationPoint } from "@/types";

declare global {
  interface Window {
    io?: (url: string, options?: Record<string, unknown>) => {
      connect: () => void;
      disconnect: () => void;
      emit: (event: string, payload: unknown) => void;
      on: (event: string, handler: (payload: unknown) => void) => void;
      off: (event: string, handler: (payload: unknown) => void) => void;
    };
  }
}

let socketClientPromise: Promise<void> | null = null;

function loadSocketClient(socketUrl: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.io) return Promise.resolve();
  if (socketClientPromise) return socketClientPromise;
  socketClientPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${socketUrl.replace(/\/$/, "")}/socket.io/socket.io.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Socket.io client script failed to load"));
    document.head.appendChild(script);
  });
  return socketClientPromise;
}

export function useRouteSocket({
  pickup,
  drop,
  enabled,
  onAvailability,
  onTripStatus,
  onDriverGps,
}: {
  pickup?: LocationPoint;
  drop?: LocationPoint;
  enabled: boolean;
  onAvailability?: () => void;
  onTripStatus?: (payload: unknown) => void;
  onDriverGps?: (payload: unknown) => void;
}) {
  useEffect(() => {
    if (!enabled || !pickup || !drop) return;
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL;
    if (!socketUrl) return;
    let socket: ReturnType<NonNullable<typeof window.io>> | null = null;
    let cancelled = false;

    const availabilityHandler = () => onAvailability?.();
    const statusHandler = (payload: unknown) => onTripStatus?.(payload);
    const gpsHandler = (payload: unknown) => onDriverGps?.(payload);

    loadSocketClient(socketUrl)
      .then(() => {
        if (cancelled || !window.io) return;
        socket = window.io(socketUrl, { transports: ["websocket", "polling"] });
        socket.connect();
        socket.emit("route:join", { from: pickup.name, to: drop.name });
        socket.on("availability:update", availabilityHandler);
        socket.on("trip:status", statusHandler);
        socket.on("driver:gps", gpsHandler);
      })
      .catch(() => {
        // The booking flows keep a slow polling fallback when Socket.io is unavailable.
      });

    return () => {
      cancelled = true;
      if (socket) {
        socket.off("availability:update", availabilityHandler);
        socket.off("trip:status", statusHandler);
        socket.off("driver:gps", gpsHandler);
        socket.disconnect();
      }
    };
  }, [drop, enabled, onAvailability, onDriverGps, onTripStatus, pickup]);
}
