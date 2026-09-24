import type { Metadata } from "next";
import "./globals.css";

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
      <body className="bg-paros-cream text-espresso antialiased selection:bg-paros-yellow selection:text-espresso min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
