import type { Metadata } from "next";
import "@/app/globals.css";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = { title: { default: "Backhaul — Return Trips Made Useful", template: "%s | Backhaul" }, description: "Fixed-price return-trip matching for passengers and goods." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Providers><Navbar /><main className="min-h-[70vh]">{children}</main><Footer /></Providers></body></html>;
}
