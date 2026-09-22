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

### FR-5: Customer CRM & WhatsApp Digital Receipts
- **FR-5.1**: Customer phone number entry during or before order completion.
- **FR-5.2**: Instant recognition: Displays Customer Name, Total Visits, Favorite / Last Ordered Items, and Special Notes.
- **FR-5.3**: **WhatsApp Digital Bill**: 1-click generation of a pre-formatted WhatsApp message link with an itemized digital receipt URL, allowing paperless operation.
- **FR-5.4**: Customer Directory with visit logs, lifetime spend, and repeat rate metrics.

### FR-6: Owner Dashboard & Day-End (Z-Report)
- **FR-6.1**: Real-time summary dashboard: Today's Total Gross & Net Sales, Total Orders, Average Order Value (AOV).
- **FR-6.2**: Payment mode breakdown (UPI vs. Cash vs. Card).
- **FR-6.3**: Best-selling items and categories of the day.
- **FR-6.4**: 1-click Day-End Closure (Z-Report) summarizing total revenue, tax collected, and cash reconciliations.

---

## 2. Non-Functional Requirements
- **NFR-1 (Speed & Latency):** Sub-100ms item selection and immediate optimistic cart updates.
- **NFR-2 (Responsive & Device Agnostic):** Fully responsive touch UI optimized for 10-inch tablets (cashier/kitchen) and mobile phones (waiters/captains).
- **NFR-3 (Ease of Use):** Zero onboarding curve—new staff can punch their first order in under 60 seconds.
- **NFR-4 (Reliability):** Local caching and fault-tolerant state so an accidental browser refresh does not discard an active cart or table state.
