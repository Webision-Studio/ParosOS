import type { Metadata } from "next";
import "./globals.css";
import { DemoDock } from "@/components/common/DemoDock";

export const metadata: Metadata = {
  title: "Paros — Table se Kitchen tak. Bas Paros.",
  description:
    "The zero-hardware, paperless Cafe & Restaurant POS Operating System. Counter POS, Kitchen KDS, Table QR ordering, WhatsApp billing — all from any phone, tablet, or laptop. Starting at ₹499/mo.",
  keywords: [
    "cafe POS",
    "restaurant POS India",
    "kitchen display system",
    "table QR ordering",
    "WhatsApp billing",
    "paperless POS",
    "zero hardware POS",
    "Petpooja alternative",
  ],
  openGraph: {
    title: "Paros — The Operating System for Modern Cafes & Indie Eateries",
    description:
      "Stop paying ₹40,000/yr for clunky Windows POS. Run your entire cafe for ₹499/mo with zero hardware, zero paper, zero commission.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-paros-cream text-espresso antialiased selection:bg-paros-yellow selection:text-espresso min-h-screen flex flex-col">
        {children}
        <DemoDock />
      </body>
    </html>
  );
}
