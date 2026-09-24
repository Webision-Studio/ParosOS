# Paros (Project Overview)

> **Tagline:** *Table se Kitchen tak. Bas Paros.*  
> *(English: The Operating System for Modern Cafes & Indie Eateries)*

## 🎯 Vision & Objective
**Paros** is an agile, modern SaaS platform engineered specifically for **local cafes, neighbourhood bakeries, cloud kitchens, and small indie eateries**.

While enterprise POS giants like Petpooja dominate large restaurant chains with dense, hardware-heavy, and expensive systems (₹15,000–₹30,000+/yr with hidden module fees), Paros delivers an **affordable, zero-training, web-first solution** that covers the essential 80% of daily cafe operations:
1. **Interactive Floor & Table Management (Mode A Universal QR Code)**
2. **Lightning-fast POS Billing, Modifiers, Split/Merge & Park Orders**
3. **Live Digital Kitchen Display System (KDS)** (Dynamic Chef ETA & paperless kitchen)
4. **Built-in Customer CRM, 1-Click WhatsApp Receipts & Web Push Offers**
5. **Deep Expense Manager (Cash Drawer tied) & Swiggy/Zomato Tracking**
6. **Real-time Sales, Historical Date-Picker & Day-End Z-Report**


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
- **Transparent & Accessible Pricing (Silver & Gold):**
  - **Silver Plan (₹499/month or ₹4,999/year):** Counter POS Billing, Kitchen KDS, WhatsApp Receipts, Expense Manager, Offline PWA.
  - **Gold Plan (₹899/month or ₹8,499/year):** Everything in Silver + Customer Table QR Scan-to-Order, Free Web Push Broadcasts, Live Floor Management, and Swiggy/Zomato Delivery Tracking.


---

## 🛠 Tech Stack
- **Frontend & Fullstack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React, Radix UI / Shadcn UI components.
- **Backend & Data Access:** Next.js Route Handlers & Server Actions, Prisma ORM.
- **Database:** SQLite (for rapid local development & zero-friction demo) / PostgreSQL (production target).
- **Real-time Layer:** Real-time event dispatch (SSE / WebSocket) for instantaneous POS-to-Kitchen order firing.
- **Billing & Printing:** Standard Web Print API (thermal slip format) + WhatsApp Bill Share API link generator.
