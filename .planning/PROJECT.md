# BistroPulse (Project Overview)

## 🎯 Vision & Objective
**BistroPulse** is an agile, modern SaaS platform engineered specifically for **local cafes, neighbourhood bakeries, cloud kitchens, and small indie eateries**.

While enterprise POS giants like Petpooja dominate large restaurant chains with dense, hardware-heavy, and expensive systems (₹15,000–₹30,000+/yr with hidden module fees), BistroPulse delivers an **affordable, zero-training, web-first solution** that covers the essential 80% of daily cafe operations:
1. **Interactive Floor & Table Management**
2. **Lightning-fast POS Billing & Add-on Modifiers**
3. **Live Digital Kitchen Display System (KDS)** (saving paper and printer costs)
4. **Built-in Customer CRM & WhatsApp Digital Receipts**
5. **Real-time Sales & Day-End Insights**

---

## 👥 Target Users & Personas
- **The Cafe Owner:** Needs real-time visibility into sales, cash vs. UPI payments, customer repeat visits, and daily closure without dealing with accounting complexity.
- **The Cashier / Barista:** Needs a lightning-fast checkout flow with search, item modifiers (milk alternatives, temperature, sugar levels), quick discounts, and UPI QR display.
- **The Kitchen / Chef:** Needs a simple, clear, color-coded digital screen that shows orders in real-time as they are punched, tracking prep times and marking items ready.
- **The Customer:** Gets a friendly, personalized experience ("Welcome back!") and a clean digital bill directly on WhatsApp without waiting for paper prints.

---

## 💡 Key Differentiators vs. Petpooja
- **No Hardware Lock-in:** 100% web-responsive. Runs seamlessly on an iPad, Android tablet, phone, or existing laptop.
- **Paperless Kitchen (KDS First):** Includes a real-time Kitchen Display System out of the box so cafes don't need dedicated thermal KOT printers.
- **Customer Relationship at POS:** Recognizes regular customers by phone number, remembers their favorites, and generates instant WhatsApp bills.
- **Transparent & Accessible Pricing:** Accessible monthly/annual subscription suited for micro and small food entrepreneurs.

---

## 🛠 Tech Stack
- **Frontend & Fullstack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React, Radix UI / Shadcn UI components.
- **Backend & Data Access:** Next.js Route Handlers & Server Actions, Prisma ORM.
- **Database:** SQLite (for rapid local development & zero-friction demo) / PostgreSQL (production target).
- **Real-time Layer:** Real-time event dispatch (SSE / WebSocket) for instantaneous POS-to-Kitchen order firing.
- **Billing & Printing:** Standard Web Print API (thermal slip format) + WhatsApp Bill Share API link generator.
