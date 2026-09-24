import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as Indian Rupees with locale formatting
 * e.g., 214990 -> "₹2,14,990"
 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

/**
 * Calculate legacy POS cost based on daily orders
 */
export function calculateLegacyCost(dailyOrders: number) {
  const paperAnnual = dailyOrders * 365 * 1.125;
  const avgTicket = 320;
  const annualGTV = dailyOrders * avgTicket * 365;
  const mdrAnnual = annualGTV * 0.016;
  const baseLegacyFixed = 20000 + 35000 + 4500; // Software + Terminal + AMC
  const totalLegacy = Math.round(baseLegacyFixed + paperAnnual + mdrAnnual);
  const parosCost = 4999;
  const savings = totalLegacy - parosCost;
  const tablesEstimate = Math.max(4, Math.round(dailyOrders / 6.5));

  return {
    paperAnnual: Math.round(paperAnnual),
    mdrAnnual: Math.round(mdrAnnual),
    totalLegacy,
    parosCost,
    savings,
    tablesEstimate,
  };
}
