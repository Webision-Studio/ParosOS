# Requirements Specification: BistroPulse

## 1. Functional Requirements

### FR-1: Table & Floor Management (Zones, Split & Merge)
- **FR-1.1**: Visual interactive floor plan displaying tables with real-time status badges (`Available`, `Occupied`, `KOT Fired`, `Bill Requested`).
- **FR-1.2**: Support Quick-Service / Takeaway counter orders without assigning a table.
- **FR-1.3**: **Table Operations**:
  - **Merge Tables:** Join Table 2 and Table 3 into a single combined tab for large groups.
  - **Move / Transfer Table:** Shift an active order from Table 1 to Table 5 in 1 click.
  - **Table Enable / Disable Toggle:** Temporarily disable a table QR code if the table is reserved or under maintenance.

### FR-2: Menu Management & POS Order Punching
- **FR-2.1**: **Rich Cafe Menu Manager (`/menu`)**:
  - Drag-and-drop CSV / Excel upload for bulk menu import with downloadable sample template.
  - Visual item creator: Item Name, Price, Category, Photo, Veg/Non-Veg badge, Description, Variants (Regular/Large), and Add-ons (Oat milk, Extra cheese).
  - Quick toggle: "In Stock" / "86'd Out of Stock" to instantly disable unavailable items across POS and Table QR menus.
- **FR-2.2**: Category-based quick navigation and keyboard/touch instant search.
- **FR-2.3**: **Park Orders ("Hold Bill")**: Cashier can temporarily park an in-progress order to serve the next customer in line, then resume it in 1 click.
- **FR-2.4**: Kitchen special instructions per item (e.g., "Oat milk, extra hot, no sugar").

### FR-3: Real-Time Kitchen Display System (KDS) & Dynamic Chef ETA
- **FR-3.1**: Instant live order push to the Kitchen Display screen (`/kitchen`) with audio chime.
- **FR-3.2**: **Dynamic Chef ETA Selector**:
  - Upon receiving an order, the chef can tap a quick prep-time preset: `[ 5 mins ]`, `[ 10 mins ]`, `[ 15 mins ]`, or `[ 20 mins ]` (or keep default).
  - The customer's mobile tracking screen dynamically updates in real-time: *"Your order is being prepped! Ready in ~X mins"* with live countdown progress.
- **FR-3.3**: **Legit Speed & Time Tracking**:
  - `orderFiredAt` timestamp automatically recorded when order is submitted from POS or Table QR.
  - Kitchen Chef taps `"Mark Ready"` when order is plated, recording exact `orderReadyAt` timestamp.
  - Legit prep duration = `orderReadyAt - orderFiredAt` (true, verifiable metric calculated down to the second).
- **FR-3.4**: Elapsed time color indicator: Green (< 10 mins), Amber (10–18 mins), Red (> 18 mins overdue).
- **FR-3.5**: Chef action buttons: Mark Item / Ticket as `In Progress`, `Ready`, or `Completed`.
- **FR-3.6**: Thermal receipt print fallback (Web Print CSS formatted for 58mm / 80mm thermal printers).

### FR-4: Billing, Payments, GST & Cash Drawer Reconciliation
- **FR-4.1**: **Split Bills & Refunds**:
  - Split bill equally (e.g. across 4 guests) or item-wise.
  - Refund / void item with mandatory reason logging for manager audit.
- **FR-4.2**: **GST Invoicing**:
  - Automatic CGST (2.5%) + SGST (2.5%) for restaurant tax compliance or IGST.
  - Sequential tax invoice numbering (e.g. `INV-2026-00142`) and HSN code (`996331`).
- **FR-4.3**: **Hardware-Agnostic Web Thermal Printing**:
  - Web Print API layout formatted for standard 58mm and 80mm ESC/POS thermal receipt printers (works with any printer the cafe already owns).
- **FR-4.4**: Flat or percentage-based discount application with pre-set buttons (5%, 10%, 20%, Custom).
- **FR-4.5**: Payment method selection: Cash, UPI (Dynamic UPI QR Code generation with bill amount), Card, or Split Pay.
- **FR-4.6**: **Automated Cash Drawer Tracking**:
  - Quick tender cash buttons (e.g. Bill ₹240, tapped ₹500 -> "Change to return: ₹260").
  - Day-End Cash Reconciliation: Expected vs counted physical cash to prevent staff shortages.

### FR-5: Lean Customer CRM, Web Push Broadcasts & Growth Engine
- **FR-5.1**: Customer Phone Number capture at POS / QR checkout (auto-recalls Name, Total Visits, and Last Ordered Item).
- **FR-5.2**: **Smart Google Review Booster & Private Feedback Shield**:
  - 5-Star rating on digital receipt routes directly to the cafe's Google Maps Review page.
  - 1–3 Star ratings open a private direct feedback box sent to the owner's dashboard/WhatsApp (captures concerns privately, no automatic refund mentions).
- **FR-5.3**: **"We Miss You" Win-Back WhatsApp Engine** (System identifies customers with no visits in 20+ days; owner can send a pre-filled 1-click re-engagement message with special offer).

- **FR-5.4**: **1-Click Web Push Notification Broadcasts (100% Free Marketing)**:
  - When customer opens the Table QR menu, 1-tap prompt: *"Get exclusive cafe offers & discounts on your phone? [Allow]"*.
  - Stores browser Web Push token (supports Android Chrome & iOS Safari 16.4+).
  - Owner can broadcast instant flash offers (e.g. *"🌧️ Rainy Day Special: 20% off all Hot Coffees until 6 PM!"*) directly to all subscribed customer phone lock screens with zero SMS cost.
- **FR-5.5**: Clean customer directory with visit counts, last visit date, and lifetime spend.

### FR-6: Owner Dashboard, Deep Expense Manager & Channel Ledger
- **FR-6.1**: **Date-Range Switcher**: Real-time "Today" view, "Yesterday", "This Week", "This Month", or Custom Calendar Date Picker to inspect historical daily performance.
- **FR-6.2**: Real-time summary metrics: Gross Sales, Net Sales, Total Orders, Average Order Value (AOV).
- **FR-6.3**: **Deep Expense Manager ("Money-Out" Ledger)**:
  - **Quick Entry Modal**: Date, Category (`Milk / Dairy`, `Produce / Veg`, `Packaging & Disposables`, `Staff Daily Wages`, `Gas / Utilities`, `Repairs / Maintenance`), Amount, Payment Source (`Cash Drawer`, `Bank / UPI`), Description/Notes, and Receipt photo upload.
  - **Cash Drawer Linkage**: If paid via "Cash Drawer", the system automatically deducts this from the expected cash balance at day-end close, preventing false cash shortage alarms!
  - **True Net Profit Calculation**: Displays `Gross Sales - Total Operating Expenses = True Daily Net Cash Flow`.
  - **Monthly Expense Analytics**: Category breakdown pie-chart showing where money was spent.
- **FR-6.4**: **Swiggy & Zomato Delivery Order Tracking**:
  - **Channel Tagging at POS**: Cashier punches delivery orders with 1 tap: `[ Zomato ]` or `[ Swiggy ]`.
  - **Order Fields**: Aggregator Order ID (e.g. `ZOM-4821` / `SWIG-9120`), Rider Name & Phone (optional), Items, and Subtotal.
  - **Kitchen Routing**: Ticket sends directly to Kitchen KDS with a distinct badge: `🛵 ZOMATO RIDER PICKUP` so cooks package it in delivery containers instead of dine-in plates.
  - **Aggregator Financial Ledger**:
    * Gross Sales from Swiggy/Zomato.
    * Configurable commission deduction estimate (e.g., 20%–25%) to calculate **Net Payout Expected** from aggregators.
    * Comparison report: Revenue from `Dine-In` vs `Takeaway` vs `Zomato` vs `Swiggy`.
- **FR-6.5**: Payment mode ledger (Cash vs. UPI vs. Card breakdown) with transaction-by-transaction audit log.
- **FR-6.6**: **1-Click Export**: Download daily/monthly sales, expenses, and channel data as CSV/Excel (compatible with Google Sheets).
- **FR-6.7**: 1-click Day-End Closure (Z-Report) summarizing total revenue, expenses, tax collected, and cash reconciliations.



### FR-7: Customer Table QR Scan-to-Order & Guest Service
- **FR-7.1**: **Single Common QR Code Architecture**:
  - One universal QR code for the entire cafe (`/order`). Cafe owners only print a single, identical QR sticker/stand across all tables.
  - Upon scanning, guest is prompted: *"Select Your Table Number"* with an ergonomic visual grid (`[ 1 ] [ 2 ] [ 3 ]...`) or `[ Takeaway ]`.
  - Prominent sticky banner throughout ordering: `📍 Ordering for Table 4 (Tap to Change)`.
  - Eliminates physical stand-swap attacks and reduces printing setup friction to zero!
- **FR-7.2**: **Complete Mobile Guest Journey**:


  - Welcome Banner with Cafe Name & Table Number.
  - Search bar + Category scroll (Coffee, Shakes, Breakfast, Bakery) + Veg/Non-veg filter tags.
  - Item detail sheet: Photos, descriptions, size selector (Regular/Large), modifier checkboxes (Oat milk, extra shot).
  - **Interactive Floating Cart**: item list, quantity `+ / -` adjustments, cooking notes input ("extra crispy").
  - **Guest Action Buttons**: 1-tap **"Call Waiter"** (alerts cashier/waiter: *"Table 4 needs assistance"*) and **"Request Bill"**.
  - Guest details input: Name & Phone number (to get WhatsApp receipt & loyalty memory).
  - Flexible checkout: "Pay via UPI on Phone" or "Pay at Counter".
  - **Live Order Status Screen**: Shows real-time dynamic countdown: *"Your order will be ready in ~X minutes!"* as set by the kitchen master, updating to *"🎉 Your order is READY for pickup!"*.
- **FR-7.3**: Instant direct sync: Table QR order instantly pops up on the Cashier POS and Kitchen KDS screen with a distinctive "Table QR Order" badge.


### FR-8: SaaS Founder & Super-Admin Control Tower (`/admin`)
- **FR-8.1**: Global Platform Pulse: Total registered cafes, active cafes today, platform Gross Merchandise Value (GMV), total orders processed, and Monthly Recurring Revenue (MRR).
- **FR-8.2**: **Founder Cafe & Payment Ledger (Google Sheets / CSV Sync)**:
  - Table of all cafes: Cafe Name, Owner Name, Phone, City, Registration Date, Plan (Trial vs Paid ₹2,499), Payment Status (Paid, Pending, Overdue), Renewal Date.
  - 1-Click "Export to Google Sheets / CSV" button + optional Google Sheets Webhook sync.
- **FR-8.3**: **Automated SaaS Subscription Reminders (WhatsApp & Email)**:
  - 3 days before trial or subscription expiration: automated WhatsApp/email alert to the cafe owner with 1-click renewal payment link.
  - Renewal confirmation receipt dispatched immediately upon successful payment.
- **FR-8.4**: Cafe Health & Adoption Scorecard (Is the software helping them?):
  - **Live Status:** 🟢 Active Now (orders firing), 🟡 Idle Today, 🔴 At-Risk / Inactive (>48 hrs without an order).
  - **QR vs POS Adoption Rate:** % of orders placed by customers scanning table QR vs manual waiter punching (proves labor saved).
  - **Paperless Impact Counter:** Count of digital WhatsApp bills generated (translates to ₹ saved on paper rolls).
  - **Legitimate Kitchen Speed:** Verifiable prep timestamps (`orderReadyAt` - `orderFiredAt`).
  - **Google Review Booster Impact:** Count of 5-star Google review clicks generated for each cafe.
- **FR-8.5**: Cafe Fleet Directory & Impersonation Support: 1-click "Support Login" to view any cafe's dashboard and assist them.





---

## 2. Non-Functional & Architecture Requirements
- **NFR-1 (Speed & Latency):** Sub-100ms item selection and immediate optimistic cart updates.
- **NFR-2 (Offline-First Web PWA Engine):**
  - **Service Worker & Cache API:** App shell, UI components, icons, audio chimes cached locally. App launches in 0.5s even with zero internet.
  - **IndexedDB Local Storage:** Cafe menu, categories, and table states mirrored locally in the browser database.
  - **Offline Order Queue:** Orders punched when the internet drops are stored in an indexed `offline_queue`.
  - **Visual Status Badge:** Screen indicates `⚡ Offline Mode (X orders waiting to sync)` without halting counter billing or thermal printing.
  - **Automatic Background Sync:** Flushes queue to PostgreSQL/Prisma database the second WiFi/cellular reconnects.
- **NFR-3 (Role-Based Access Control - RBAC):**
  - **Owner Role:** Full access via Email/Password (Settings, Menu prices, Financial Analytics, CRM export, Z-reports).
  - **Cashier / POS Role:** Fast 4-digit PIN unlock. Access limited to `/pos` (table grid, order punching, WhatsApp receipts). Blocked from viewing owner profits, raw customer exports, or sensitive business settings.
  - **Kitchen / KDS Role:** Dedicated view `/kitchen` showing only pending order tickets. Zero financial or customer PII visible.
  - **Customer Table Guest:** Public `/order?table=X` session for scanning and ordering directly from tables.
- **NFR-4 (Hardware-Agnostic Printing):** Standard CSS `@media print` formatted for 58mm/80mm thermal receipt printers without proprietary drivers.
- **NFR-5 (Ease of Use):** Zero onboarding curve—new staff can punch their first order in under 60 seconds.
- **NFR-6 (Buttery Smooth 60 FPS UI/UX Standards):**
  - **0ms Optimistic UI:** Cart modifications, item selections, and category switches update instantaneously via Zustand before network sync.
  - **Tactile Micro-Interactions:** Micro-scale transitions (`:active:scale-[0.97] transition-transform duration-100 ease-out`), crisp visual feedback, and optional soft audio chimes on ticket firing.
  - **Ergonomic Touch Targets:** Minimum 48px x 48px touch bounding boxes across all buttons to prevent miss-taps during rush-hour madness.
  - **Zero Layout Shift (CLS = 0):** Hardware-accelerated CSS transforms (`will-change: transform`), skeleton shimmer loaders, and fixed-aspect media wrappers.
- **NFR-7 (Advanced Security & Anti-Fraud Hardening):**
  - **Inactivity Station Auto-Lock:** 60-second idle timer locks the counter POS screen back to the 4-digit PIN numpad to prevent unauthorized tampering when staff steps away.
  - **Anti-Double-Billing Concurrency Lock:** Row-level optimistic concurrency checks prevent simultaneous double-settlement if two devices or cashiers tap settle at the same millisecond.
  - **Offline Price Tamper Proofing:** When offline orders sync to the cloud, the server recalculates every single item against master database pricing; client-side price tampering is mathematically impossible.
  - **PII Masking & Anti-Scraping:** Customer phone numbers are masked on staff screens (`+91 98765 •••••`), and database columns are encrypted.



