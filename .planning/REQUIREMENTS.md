# Requirements Specification: BistroPulse

## 1. Functional Requirements

### FR-1: Table & Floor Management
- **FR-1.1**: Visual interactive floor plan displaying tables with real-time status badges:
  - `Available` (Green)
  - `Occupied` (Amber)
  - `KOT Fired / In Kitchen` (Blue)
  - `Bill Requested` (Purple)
- **FR-1.2**: Support Quick-Service / Takeaway counter orders without assigning a table.
- **FR-1.3**: Ability to switch, merge, or reassign tables for an active order.

### FR-2: Menu Management & POS Order Punching
- **FR-2.1**: **Rich Cafe Menu Manager (`/menu`)**:
  - Drag-and-drop CSV / Excel upload for bulk menu import with downloadable sample template.
  - Visual item creator: Item Name, Price, Category, Photo, Veg/Non-Veg badge, Description, Variants (Regular/Large), and Add-ons (Oat milk, Extra cheese).
  - Quick toggle: "In Stock" / "86'd Out of Stock" to instantly disable unavailable items across POS and Table QR menus.
- **FR-2.2**: Category-based quick navigation and keyboard/touch instant search.
- **FR-2.3**: Kitchen special instructions per item (e.g., "Oat milk, extra hot, no sugar").

### FR-3: Real-Time Kitchen Display System (KDS) & Legit Prep Speed
- **FR-3.1**: Instant live order push to the Kitchen Display screen (`/kitchen`) with audio chime.
- **FR-3.2**: **Legit Speed & Time Tracking**:
  - `orderFiredAt` timestamp automatically recorded when order is submitted from POS or Table QR.
  - Kitchen Chef taps `"Mark Ready"` when order is plated, recording exact `orderReadyAt` timestamp.
  - Legit prep duration = `orderReadyAt - orderFiredAt` (true, verifiable metric calculated down to the second).
- **FR-3.3**: Elapsed time color indicator: Green (< 10 mins), Amber (10–18 mins), Red (> 18 mins overdue).
- **FR-3.4**: Chef action buttons: Mark Item / Ticket as `In Progress`, `Ready`, or `Completed`.
- **FR-3.5**: Thermal receipt print fallback (Web Print CSS formatted for 58mm / 80mm thermal printers).

### FR-4: Billing, Payments & Invoicing
- **FR-4.1**: Automatic calculation of Subtotal, Taxes (customizable GST/VAT toggle), and Service Charge.
- **FR-4.2**: Flat or percentage-based discount application with pre-set buttons (5%, 10%, 20%, Custom).
- **FR-4.3**: Payment method selection: Cash, UPI (Dynamic UPI QR Code generation with bill amount), Card, or Split Pay.
- **FR-4.4**: Receipt generation with sequential bill numbering.

### FR-5: Lean Customer CRM & Growth Engine
- **FR-5.1**: Customer Phone Number capture at POS / QR checkout (auto-recalls Name, Total Visits, and Last Ordered Item).
- **FR-5.2**: **Smart Google Review Booster** (WhatsApp receipt includes 1-tap rating: 5-star ratings route directly to the cafe's Google Maps Review page; 1–3 star ratings route to private owner WhatsApp feedback).
- **FR-5.3**: **"We Miss You" Win-Back WhatsApp Engine** (System identifies customers with no visits in 20+ days; owner can send a pre-filled 1-click re-engagement message with special offer).
- **FR-5.4**: Clean customer directory with visit counts, last visit date, and lifetime spend.

### FR-6: Owner Dashboard & Historical Date-Picker
- **FR-6.1**: **Date-Range Switcher**: Real-time "Today" view, "Yesterday", "This Week", "This Month", or Custom Calendar Date Picker to inspect historical daily performance.
- **FR-6.2**: Real-time summary metrics: Gross Sales, Net Sales, Total Orders, Average Order Value (AOV).
- **FR-6.3**: Payment mode ledger (Cash vs. UPI vs. Card breakdown) with transaction-by-transaction audit log.
- **FR-6.4**: **1-Click Export**: Download daily/monthly sales data as CSV/Excel (compatible with Google Sheets).
- **FR-6.5**: 1-click Day-End Closure (Z-Report) summarizing total revenue, tax collected, and cash reconciliations.

### FR-7: Customer Table QR Scan-to-Order & Mobile Cart
- **FR-7.1**: Unique printable QR code generated for each table (e.g. `/order?table=4`).
- **FR-7.2**: **Complete Mobile Guest Journey**:
  - Welcome Banner with Cafe Name & Table Number.
  - Search bar + Category scroll (Coffee, Shakes, Breakfast, Bakery) + Veg/Non-veg filter tags.
  - Item detail sheet: Photos, descriptions, size selector (Regular/Large), modifier checkboxes (Oat milk, extra shot).
  - **Interactive Floating Cart**: item list, quantity `+ / -` adjustments, cooking notes input ("extra crispy").
  - Guest details input: Name & Phone number (to get WhatsApp receipt & loyalty memory).
  - Flexible checkout: "Pay via UPI on Phone" or "Pay at Counter".
  - Live order tracking screen: "Order #14 Placed ➔ In Kitchen 🍳 (Est. 10m)".
- **FR-7.3**: Instant direct sync: Table QR order instantly pops up on the Cashier POS and Kitchen KDS screen with a distinctive "Table QR Order" badge.

### FR-8: SaaS Founder & Super-Admin Control Tower (`/admin`)
- **FR-8.1**: Global Platform Pulse: Total registered cafes, active cafes today, platform Gross Merchandise Value (GMV), total orders processed, and Monthly Recurring Revenue (MRR).
- **FR-8.2**: **Founder Cafe & Payment Ledger (Google Sheets / CSV Sync)**:
  - Table of all cafes: Cafe Name, Owner Name, Phone, City, Registration Date, Plan (Trial vs Paid ₹2,499), Payment Status (Paid, Pending, Overdue), Renewal Date.
  - 1-Click "Export to Google Sheets / CSV" button + optional Google Sheets Webhook sync.
- **FR-8.3**: Cafe Health & Adoption Scorecard (Is the software helping them?):
  - **Live Status:** 🟢 Active Now (orders firing), 🟡 Idle Today, 🔴 At-Risk / Inactive (>48 hrs without an order).
  - **QR vs POS Adoption Rate:** % of orders placed by customers scanning table QR vs manual waiter punching (proves labor saved).
  - **Paperless Impact Counter:** Count of digital WhatsApp bills generated (translates to ₹ saved on paper rolls).
  - **Legitimate Kitchen Speed:** Verifiable prep timestamps (`orderReadyAt` - `orderFiredAt`).
  - **Google Review Booster Impact:** Count of 5-star Google review clicks generated for each cafe.
- **FR-8.4**: Cafe Fleet Directory & Impersonation Support: 1-click "Support Login" to view any cafe's dashboard and assist them.




---

## 2. Non-Functional & Architecture Requirements
- **NFR-1 (Speed & Latency):** Sub-100ms item selection and immediate optimistic cart updates.
- **NFR-2 (Web-First PWA):** Progressive Web App architecture (installable on iPad, Android tablet, phone, desktop with zero software downloads). Fullscreen app experience with offline resilience.
- **NFR-3 (Role-Based Access Control - RBAC):**
  - **Owner Role:** Full access via Email/Password (Settings, Menu prices, Financial Analytics, CRM export, Z-reports).
  - **Cashier / POS Role:** Fast 4-digit PIN unlock. Access limited to `/pos` (table grid, order punching, WhatsApp receipts). Blocked from viewing owner profits, raw customer exports, or sensitive business settings.
  - **Kitchen / KDS Role:** Dedicated view `/kitchen` showing only pending order tickets. Zero financial or customer PII visible.
  - **Customer Table Guest:** Public `/order?table=X` session for scanning and ordering directly from tables.
- **NFR-4 (Ease of Use):** Zero onboarding curve—new staff can punch their first order in under 60 seconds.
- **NFR-5 (Reliability & Cache):** Local caching and fault-tolerant state so an accidental browser refresh does not discard an active cart or table state.

