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

### FR-2: Menu & POS Order Punching
- **FR-2.1**: Category-based quick navigation (e.g., Coffee, Cold Brews, Pastries, Breakfast, Sandwiches).
- **FR-2.2**: Fast search bar with keyboard/touch shortcuts.
- **FR-2.3**: Item Variants (e.g., Hot / Iced, Regular / Large) and Modifiers/Add-ons (e.g., Almond Milk, Extra Shot, Less Sugar).
- **FR-2.4**: Kitchen special instructions per item or per ticket (e.g., "Oat milk, extra hot, no sugar").

### FR-3: Real-Time Kitchen Display System (KDS) & KOT
- **FR-3.1**: Instant live order push to the Kitchen Display screen when an order or additional item is fired.
- **FR-3.2**: Order cards displaying Table #, Ticket #, order timestamp, item checklist, and cooking notes.
- **FR-3.3**: Elapsed time color indicator:
  - Green (< 10 mins)
  - Amber (10–18 mins)
  - Red (> 18 mins overdue)
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


### FR-6: Owner Dashboard & Day-End (Z-Report)
- **FR-6.1**: Real-time summary dashboard: Today's Total Gross & Net Sales, Total Orders, Average Order Value (AOV).
- **FR-6.2**: Payment mode breakdown (UPI vs. Cash vs. Card).
- **FR-6.3**: Best-selling items and categories of the day.
- **FR-6.4**: 1-click Day-End Closure (Z-Report) summarizing total revenue, tax collected, and cash reconciliations.

### FR-7: Customer Table QR Scan-to-Order
- **FR-7.1**: Unique printable QR code generated for each table (e.g. `/order?table=4`).
- **FR-7.2**: Mobile-optimized guest digital menu: browse dishes, high-res photos, veg/non-veg tags, allergen warnings.
- **FR-7.3**: Self-checkout cart: customer customizes variants & add-ons, enters their phone/name, and places order directly.
- **FR-7.4**: Instant direct sync: Table QR order instantly pops up on the Cashier POS and Kitchen KDS screen with a distinctive "Table QR Order" badge.
- **FR-7.5**: Optional Pay-at-Table or Pay-at-Counter mode.


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

