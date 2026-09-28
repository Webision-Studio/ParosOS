/**
 * Brevo (formerly Sendinblue) Transactional Email Engine
 *
 * Handles:
 * 1. Customer Digital Tax Invoice / Receipts (with Google Review button)
 * 2. Nightly End-of-Day Sales & Till Audit Reports for Cafe Owners
 * 3. Dynamic Multi-Tenant Sender Branding (Custom Cafe Name as sender name)
 * 4. Graceful mock fallback when BREVO_API_KEY is not yet configured
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface CustomerReceiptParams {
  cafe: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    gstin?: string | null;
    googleReviewUrl?: string | null;
  };
  bill: {
    billNumber: string;
    subtotal: number;
    discount?: number;
    cgst: number;
    sgst: number;
    total: number;
    paymentMethod: string;
    createdAt?: Date;
    tableNumber?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    notes?: string | null;
  }>;
  customer: {
    name?: string | null;
    email: string;
    phone?: string | null;
  };
}

export interface NightlyReportParams {
  cafe: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  date: string;
  totalRevenue: number;
  totalBills: number;
  avgTicket: number;
  totalGst: number;
  paymentBreakdown: {
    upi: number;
    cash: number;
    card: number;
    other: number;
  };
  shiftSummary?: {
    openingCash: number;
    cashSales: number;
    pettyExpenses: number;
    expectedCash: number;
    countedCash: number;
    discrepancy: number;
    notes?: string | null;
    operatorName?: string | null;
  } | null;
  expenses?: Array<{
    title: string;
    amount: number;
    category: string;
    paidVia: string;
  }>;
  topItems?: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
}

/**
 * Validates email address with standard RFC 5322 compliant regex
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
}

/**
 * Low-level Brevo REST API dispatcher
 */
export async function sendBrevoEmail({
  to,
  subject,
  htmlContent,
  senderName,
  replyTo,
}: {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  senderName: string;
  replyTo?: { email: string; name: string };
}): Promise<{ success: boolean; messageId?: string; mocked?: boolean; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const defaultSenderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || 'receipts@paros.app';

  // 1. If Brevo API key is not yet set, provide graceful mock/development logging
  if (!apiKey) {
    console.log(`\n📧 [BREVO MOCK EMAIL ENGINE] (Configure BREVO_API_KEY in .env to send real emails)`);
    console.log(`   To: ${to.map((r) => `${r.name || 'Recipient'} <${r.email}>`).join(', ')}`);
    console.log(`   Sender: ${senderName} <${defaultSenderEmail}>`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Content Length: ${htmlContent.length} bytes\n`);
    return { success: true, mocked: true };
  }

  // 2. Dispatch via Brevo REST API v3
  try {
    const payload: Record<string, unknown> = {
      sender: {
        name: senderName,
        email: defaultSenderEmail,
      },
      to: to.map((r) => ({
        email: r.email.trim(),
        name: r.name?.trim() || undefined,
      })),
      subject,
      htmlContent,
    };

    if (replyTo && isValidEmail(replyTo.email)) {
      payload.replyTo = {
        email: replyTo.email.trim(),
        name: replyTo.name?.trim() || senderName,
      };
    }

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Brevo API error response:', data);
      return { success: false, error: data.message || 'Failed to send email via Brevo' };
    }

    return { success: true, messageId: data.messageId };
  } catch (err: unknown) {
    console.error('Brevo network dispatch error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Network error dispatching Brevo email' };
  }
}

/**
 * Format Indian Rupee currency string
 */
function formatCurrency(amount: number): string {
  return `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * 1. Send Customer Digital Tax Receipt Email
 */
export async function sendCustomerReceiptEmail(params: CustomerReceiptParams) {
  const { cafe, bill, items, customer } = params;

  if (!isValidEmail(customer.email)) {
    return { success: false, error: 'Invalid customer email address' };
  }

  const billDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const formattedDate = billDate.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = billDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const subject = `🧾 Your Tax Receipt from ${cafe.name} (${bill.billNumber})`;

  // Build Item rows
  const itemRowsHtml = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px dashed #e5e5e5; font-size: 14px; color: #1c1917;">
          <div style="font-weight: 600;">${item.name}</div>
          ${item.notes ? `<div style="font-size: 11px; color: #78716c; margin-top: 2px;">${item.notes}</div>` : ''}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px dashed #e5e5e5; font-size: 14px; text-align: center; color: #1c1917; font-weight: 600;">
          ${item.quantity}x
        </td>
        <td style="padding: 10px 0; border-bottom: 1px dashed #e5e5e5; font-size: 14px; text-align: right; color: #1c1917; font-family: monospace; font-weight: 700;">
          ${formatCurrency(item.price * item.quantity)}
        </td>
      </tr>
    `
    )
    .join('');

  // Google Review CTA block
  const googleReviewHtml = cafe.googleReviewUrl
    ? `
      <div style="margin-top: 24px; padding: 18px; background-color: #fef08a; border-radius: 12px; border: 2px solid #1c1917; text-align: center;">
        <div style="font-size: 18px; margin-bottom: 4px;">⭐⭐⭐⭐⭐</div>
        <div style="font-size: 14px; font-weight: 800; color: #1c1917; margin-bottom: 4px;">
          Loved your experience at ${cafe.name}?
        </div>
        <div style="font-size: 12px; color: #44403c; margin-bottom: 12px;">
          Your 5-star review helps our small team grow and brew better coffee every day!
        </div>
        <a href="${cafe.googleReviewUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #a63412; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 800; border-radius: 8px; border: 2px solid #1c1917; text-transform: uppercase;">
          Leave a 5-Star Google Review ➔
        </a>
      </div>
    `
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #faf2ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #ffffff; border: 2px solid #1c1917; border-radius: 16px; box-shadow: 4px 4px 0px #1c1917; overflow: hidden; margin: 0 auto;">
        
        <!-- Header -->
        <tr>
          <td style="padding: 24px 24px 16px 24px; background-color: #a63412; text-align: center; color: #ffffff;">
            <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background-color: #ffffff; color: #a63412; font-size: 22px; font-weight: 900; border-radius: 10px; margin-bottom: 8px; border: 2px solid #1c1917;">
              P
            </div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">${cafe.name}</h1>
            ${cafe.address ? `<div style="font-size: 12px; opacity: 0.9; margin-top: 4px;">${cafe.address}${cafe.city ? `, ${cafe.city}` : ''}</div>` : ''}
            ${cafe.gstin ? `<div style="font-size: 11px; opacity: 0.85; margin-top: 2px; font-family: monospace;">GSTIN: ${cafe.gstin}</div>` : ''}
          </td>
        </tr>

        <!-- Bill Details Banner -->
        <tr>
          <td style="padding: 16px 24px; background-color: #f4ece8; border-bottom: 2px dashed #1c1917;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size: 12px; color: #58413b;">
                  <div><strong>Invoice:</strong> ${bill.billNumber}</div>
                  <div style="margin-top: 2px;"><strong>Date:</strong> ${formattedDate} at ${formattedTime}</div>
                </td>
                <td style="font-size: 12px; color: #58413b; text-align: right;">
                  ${bill.tableNumber ? `<div><strong>Table:</strong> ${bill.tableNumber}</div>` : '<div><strong>Mode:</strong> Takeaway</div>'}
                  <div style="margin-top: 2px;"><strong>Paid via:</strong> ${bill.paymentMethod}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items Table -->
        <tr>
          <td style="padding: 20px 24px 8px 24px;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #78716c; margin-bottom: 8px;">
              Itemized Tax Invoice
            </div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr>
                  <th align="left" style="font-size: 11px; font-weight: 700; color: #58413b; padding-bottom: 8px; border-bottom: 2px solid #1c1917;">ITEM</th>
                  <th align="center" style="font-size: 11px; font-weight: 700; color: #58413b; padding-bottom: 8px; border-bottom: 2px solid #1c1917;">QTY</th>
                  <th align="right" style="font-size: 11px; font-weight: 700; color: #58413b; padding-bottom: 8px; border-bottom: 2px solid #1c1917;">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                ${itemRowsHtml}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- Totals & Taxes -->
        <tr>
          <td style="padding: 12px 24px 20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #58413b;">
              <tr>
                <td style="padding: 4px 0;">Subtotal:</td>
                <td align="right" style="font-family: monospace; font-weight: 600;">${formatCurrency(bill.subtotal)}</td>
              </tr>
              ${
                bill.discount && bill.discount > 0
                  ? `<tr>
                      <td style="padding: 4px 0; color: #006d30;">Discount:</td>
                      <td align="right" style="font-family: monospace; font-weight: 600; color: #006d30;">-${formatCurrency(bill.discount)}</td>
                    </tr>`
                  : ''
              }
              <tr>
                <td style="padding: 4px 0;">CGST (2.5%):</td>
                <td align="right" style="font-family: monospace; font-weight: 600;">${formatCurrency(bill.cgst)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0;">SGST (2.5%):</td>
                <td align="right" style="font-family: monospace; font-weight: 600;">${formatCurrency(bill.sgst)}</td>
              </tr>
              <tr>
                <td colspan="2" style="border-top: 2px solid #1c1917; padding-top: 10px; margin-top: 6px;"></td>
              </tr>
              <tr style="font-size: 18px; font-weight: 900; color: #1c1917;">
                <td>Total Paid:</td>
                <td align="right" style="font-family: monospace; color: #a63412;">${formatCurrency(bill.total)}</td>
              </tr>
            </table>

            <!-- Google Review Nudge -->
            ${googleReviewHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; background-color: #1c1917; color: #a8a29e; text-align: center; font-size: 11px;">
            <div style="font-weight: 700; color: #ffffff; margin-bottom: 2px;">Table se Kitchen tak. Bas Paros.</div>
            <div>Zero-paper digital invoice generated by Paros Cafe OS.</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to: [{ email: customer.email, name: customer.name || undefined }],
    subject,
    htmlContent,
    senderName: cafe.name,
    replyTo: cafe.email ? { email: cafe.email, name: cafe.name } : undefined,
  });
}

/**
 * 2. Send Nightly End-of-Day Sales Report Email
 */
export async function sendNightlySalesReportEmail(params: NightlyReportParams) {
  const { cafe, date, totalRevenue, totalBills, avgTicket, totalGst, paymentBreakdown, shiftSummary, expenses, topItems } = params;

  const recipientEmail = cafe.email?.trim();
  if (!recipientEmail || !isValidEmail(recipientEmail)) {
    console.warn(`[Nightly Report] Cannot send email: Cafe ${cafe.name} has no valid email address (${recipientEmail}).`);
    return { success: false, error: 'Cafe has no valid email address configured' };
  }

  const subject = `🌙 Daily Sales Summary: ${cafe.name} (${date})`;

  // Top Items HTML
  const topItemsHtml = (topItems || [])
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px dashed #e5e5e5; font-size: 13px; font-weight: 600; color: #1c1917;">
          ${idx + 1}. ${it.name}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px dashed #e5e5e5; font-size: 13px; text-align: center; font-weight: 700; color: #a63412;">
          ${it.quantity} sold
        </td>
        <td style="padding: 8px 0; border-bottom: 1px dashed #e5e5e5; font-size: 13px; text-align: right; font-family: monospace; font-weight: 700;">
          ${formatCurrency(it.revenue)}
        </td>
      </tr>
    `
    )
    .join('');

  // Shift & Cash Audit HTML
  const shiftAuditHtml = shiftSummary
    ? `
      <div style="margin-top: 24px; padding: 16px; background-color: #faf2ee; border: 2px solid #1c1917; border-radius: 12px;">
        <div style="font-size: 13px; font-weight: 800; text-transform: uppercase; color: #1c1917; margin-bottom: 10px;">
          💵 Cash Drawer & Till Audit
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px; color: #58413b;">
          <tr>
            <td style="padding: 3px 0;">Opening Float Cash:</td>
            <td align="right" style="font-family: monospace; font-weight: 600;">${formatCurrency(shiftSummary.openingCash)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Cash Orders Inflow:</td>
            <td align="right" style="font-family: monospace; font-weight: 600; color: #006d30;">+${formatCurrency(shiftSummary.cashSales)}</td>
          </tr>
          <tr>
            <td style="padding: 3px 0;">Drawer Petty Expenses:</td>
            <td align="right" style="font-family: monospace; font-weight: 600; color: #ba1a1a;">-${formatCurrency(shiftSummary.pettyExpenses)}</td>
          </tr>
          <tr style="border-top: 1px dashed #d6d3d1;">
            <td style="padding: 4px 0; font-weight: 700;">Expected Till Balance:</td>
            <td align="right" style="font-family: monospace; font-weight: 700;">${formatCurrency(shiftSummary.expectedCash)}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: 700;">Actual Counted Cash:</td>
            <td align="right" style="font-family: monospace; font-weight: 700;">${formatCurrency(shiftSummary.countedCash)}</td>
          </tr>
          <tr style="font-size: 14px; font-weight: 900;">
            <td style="padding: 6px 0;">Shift Discrepancy:</td>
            <td align="right" style="font-family: monospace; color: ${shiftSummary.discrepancy < 0 ? '#ba1a1a' : shiftSummary.discrepancy > 0 ? '#006d30' : '#1c1917'};">
              ${shiftSummary.discrepancy === 0 ? '✓ Balanced (₹0.00)' : formatCurrency(shiftSummary.discrepancy)}
            </td>
          </tr>
        </table>
        ${shiftSummary.operatorName ? `<div style="font-size: 11px; color: #78716c; margin-top: 8px;">Audited & Closed by: <strong>${shiftSummary.operatorName}</strong></div>` : ''}
        ${shiftSummary.notes ? `<div style="font-size: 11px; color: #78716c; margin-top: 4px;">Notes: <em>${shiftSummary.notes}</em></div>` : ''}
      </div>
    `
    : '';

  // Itemized Expenses HTML
  const expensesHtml =
    expenses && expenses.length > 0
      ? `
      <div style="margin-top: 20px;">
        <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #78716c; margin-bottom: 6px;">
          Logged Petty Expenses (${expenses.length}):
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 12px; color: #44403c;">
          ${expenses
            .map(
              (exp) => `
            <tr>
              <td style="padding: 4px 0; border-bottom: 1px dotted #e5e5e5;">${exp.title} (${exp.category})</td>
              <td align="right" style="padding: 4px 0; border-bottom: 1px dotted #e5e5e5; font-family: monospace; font-weight: 700; color: #ba1a1a;">
                -${formatCurrency(exp.amount)}
              </td>
            </tr>
          `
            )
            .join('')}
        </table>
      </div>
    `
      : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 20px; background-color: #faf2ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917;">
      <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border: 2px solid #1c1917; border-radius: 16px; box-shadow: 5px 5px 0px #1c1917; overflow: hidden; margin: 0 auto;">
        
        <!-- Header -->
        <tr>
          <td style="padding: 24px; background-color: #1c1917; color: #ffffff;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div>
                <span style="display: inline-block; padding: 4px 8px; background-color: #92f5a4; color: #00210a; font-size: 10px; font-weight: 800; border-radius: 6px; text-transform: uppercase; margin-bottom: 6px;">
                  End-of-Day Sales Report
                </span>
                <h1 style="margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">${cafe.name}</h1>
                <div style="font-size: 12px; color: #a8a29e; margin-top: 2px;">Report Date: ${date}</div>
              </div>
            </div>
          </td>
        </tr>

        <!-- Main KPI 2x2 Grid -->
        <tr>
          <td style="padding: 20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="48%" style="padding: 14px; background-color: #fff8f5; border: 2px solid #1c1917; border-radius: 12px; box-shadow: 2px 2px 0px #1c1917;">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #78716c;">Total Net Revenue</div>
                  <div style="font-size: 24px; font-weight: 900; color: #a63412; font-family: monospace; margin-top: 4px;">
                    ${formatCurrency(totalRevenue)}
                  </div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="padding: 14px; background-color: #fff8f5; border: 2px solid #1c1917; border-radius: 12px; box-shadow: 2px 2px 0px #1c1917;">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #78716c;">Orders Settled</div>
                  <div style="font-size: 24px; font-weight: 900; color: #1c1917; font-family: monospace; margin-top: 4px;">
                    ${totalBills}
                  </div>
                </td>
              </tr>
              <tr><td colspan="3" style="height: 12px;"></td></tr>
              <tr>
                <td width="48%" style="padding: 14px; background-color: #fff8f5; border: 2px solid #1c1917; border-radius: 12px; box-shadow: 2px 2px 0px #1c1917;">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #78716c;">Avg. Ticket Size</div>
                  <div style="font-size: 22px; font-weight: 900; color: #006d30; font-family: monospace; margin-top: 4px;">
                    ${formatCurrency(avgTicket)}
                  </div>
                </td>
                <td width="4%"></td>
                <td width="48%" style="padding: 14px; background-color: #fff8f5; border: 2px solid #1c1917; border-radius: 12px; box-shadow: 2px 2px 0px #1c1917;">
                  <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #78716c;">Total GST (5%)</div>
                  <div style="font-size: 22px; font-weight: 900; color: #8d4b00; font-family: monospace; margin-top: 4px;">
                    ${formatCurrency(totalGst)}
                  </div>
                </td>
              </tr>
            </table>

            <!-- Payment Modes Breakdown -->
            <div style="margin-top: 20px; padding: 14px; background-color: #f4ece8; border-radius: 12px; border: 1px solid #e7e5e4;">
              <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #58413b; margin-bottom: 8px;">
                💳 Collection Channels
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 13px;">
                <tr>
                  <td>⚡ Direct Bank UPI:</td>
                  <td align="right" style="font-family: monospace; font-weight: 700; color: #006d30;">${formatCurrency(paymentBreakdown.upi)}</td>
                </tr>
                <tr>
                  <td style="padding-top: 4px;">💵 Cash In Till:</td>
                  <td align="right" style="font-family: monospace; font-weight: 700; padding-top: 4px;">${formatCurrency(paymentBreakdown.cash)}</td>
                </tr>
                <tr>
                  <td style="padding-top: 4px;">💳 Credit/Debit Card:</td>
                  <td align="right" style="font-family: monospace; font-weight: 700; padding-top: 4px;">${formatCurrency(paymentBreakdown.card)}</td>
                </tr>
              </table>
            </div>

            <!-- Shift Cash Audit -->
            ${shiftAuditHtml}

            <!-- Itemized Expenses -->
            ${expensesHtml}

            <!-- Top Selling Items -->
            ${
              topItems && topItems.length > 0
                ? `
              <div style="margin-top: 24px;">
                <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #78716c; margin-bottom: 8px;">
                  ☕ Top Selling Menu Items
                </div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${topItemsHtml}
                </table>
              </div>
            `
                : ''
            }
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 16px 24px; background-color: #1c1917; color: #a8a29e; text-align: center; font-size: 11px;">
            <div style="font-weight: 700; color: #ffffff; margin-bottom: 2px;">Paros Cafe OS • Nightly Automatic Audit Engine</div>
            <div>Sent to ${recipientEmail}. Data recorded locally and synchronized to Supabase Cloud.</div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendBrevoEmail({
    to: [{ email: recipientEmail, name: cafe.name }],
    subject,
    htmlContent,
    senderName: `${cafe.name} (Paros OS)`,
  });
}
