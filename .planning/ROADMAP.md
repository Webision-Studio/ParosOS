# Roadmap: BistroPulse

## Milestone 1: Core Lean Cafe POS & CRM (v1.0 MVP)

```
[Phase 1: Architecture & Foundation] 
         │
         ▼
[Phase 2: Table Management & POS Billing Interface]
         │
         ▼
[Phase 3: Real-Time Kitchen Display System (KDS)]
         │
         ▼
[Phase 4: Payments, Billing, Taxes & Dynamic UPI QR]
         │
         ▼
[Phase 5: Customer CRM & WhatsApp Digital Receipts]
         │
         ▼
[Phase 6: Owner Analytics Dashboard & Day-End Z-Report]
```

---

### Phase 1: Architecture, Data Models & Seed Engine
- **Objective:** Establish the application scaffold, Prisma relational database models, and realistic cafe seed dataset.
- **Deliverables:**
  - Next.js 15 (App Router) + Tailwind CSS + Lucide icons.
  - Relational schema: `Table`, `Category`, `MenuItem`, `Variant`, `Modifier`, `Order`, `OrderItem`, `Customer`, `Bill`.
  - Realistic seed database with cafe inventory (Espresso drinks, teas, pastries, breakfast), sample tables, and customers.
- **Verification:** Database seeded successfully; mock queries verify schema integrity.

### Phase 2: Table Floor Grid, High-Velocity POS & Customer Table QR Ordering
- **Objective:** Create the visual floor management screen, touch-optimized POS checkout experience, and customer mobile scan-to-order flow.
- **Deliverables:**
  - Table grid with live status indicators (`Vacant`, `Occupied`, `KOT Fired`, `Bill Requested`).
  - Universal Common QR Code generator (`/order`) with printable branded stand template.
  - Guest Mobile Web Menu (`/order`): instant table number selection grid (`[ 1 ][ 2 ][ 3 ]...` or `Takeaway`), food photos, variants, modifiers, and mobile self-checkout.
  - POS Counter Interface: category tabs, instant search, variant/modifier customization, cooking notes, and takeaway mode.
  - Active order cart with quantity controls and real-time state.
- **Verification:** Both Cashier (via POS) and Customer (via Common QR on phone with table selector) can create orders that sync into the active table state.



### Phase 3: Real-Time Digital Kitchen Display System (KDS) & KOT
- **Objective:** Build the paperless kitchen screen that updates instantaneously as orders are fired from the POS.
- **Deliverables:**
  - Live Kitchen Board (`/kitchen`) displaying pending order tickets.
  - Ticket details: Table #, elapsed timer, item quantities, variants, and preparation notes.
  - Status progression buttons: `Start Preparing`, `Mark Ready`, `Serve`.
  - Color-coded prep time warnings (<10m green, 10–18m yellow, >18m red alert).
  - Thermal KOT printable layout fallback.
- **Verification:** Orders fired from POS appear on the Kitchen screen in real-time; status transitions update live.

### Phase 4: Billing, Payments, GST & Dynamic UPI QR Code
- **Objective:** Provide a seamless settlement flow supporting Indian and global payment modes.
- **Deliverables:**
  - Checkout modal with itemized summary, discount engine (flat & %), and configurable GST (5% standard restaurant GST).
  - Dynamic UPI QR Code generator displaying the exact payable amount for instant mobile scanning.
  - Payment method logging: Cash, UPI, Card, or Split.
  - Thermal 58mm/80mm receipt generation with printable layout.
- **Verification:** Bill calculation verifies correct tax/discount math; test payment closes order and clears table.

### Phase 5: Customer CRM & WhatsApp Digital Receipts
- **Objective:** Turn ordinary transactions into a high-touch customer retention channel without expensive SMS gateways.
- **Deliverables:**
  - Customer phone lookup in POS: reveals customer name, visit count, and past favorite items.
  - 1-click **WhatsApp Digital Receipt**: generates a direct `api.whatsapp.com` link with an elegant digital receipt URL.
  - Dedicated `/customers` CRM directory with visit histories, total spend, and customer notes.
- **Verification:** Entering an existing number populates customer history; WhatsApp share link opens with formatted receipt text.

### Phase 6: Owner Analytics Dashboard & Day-End Z-Report
- **Objective:** Empower cafe owners with high-level clarity on business health and cash drawer reconciliation.
- **Deliverables:**
  - Visual dashboard `/dashboard`: Gross revenue, net sales, orders count, Average Order Value (AOV).
  - Payment distribution breakdown (Cash vs. UPI vs. Card).
  - Top 5 bestsellers & category performance.
  - 1-click Day-End Closure (Z-Report) with print/export summary.
- **Verification:** Accurate aggregation of simulated and completed orders across time periods and payment modes.
