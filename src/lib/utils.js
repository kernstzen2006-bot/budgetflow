/**
 * BudgetFlow – Shared Utility Functions
 * ======================================
 * Pure helper functions used across the application for formatting,
 * date arithmetic, class-name merging, and financial calculations.
 */

/**
 * Format a number as a localised currency string.
 * @param {number} amount
 * @param {string} currency – ISO 4217 code (default 'USD')
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'ZAR') {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string to "MMM dd, yyyy" (e.g. "Jan 05, 2025").
 * @param {string} dateString
 * @returns {string}
 */
export function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date string to "MMM dd" (e.g. "Jan 05").
 * @param {string} dateString
 * @returns {string}
 */
export function formatDateShort(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
  });
}

/**
 * Get the custom 25th-to-24th pay cycle for a given date.
 * If date is < 25, cycle is 25th of previous month to 24th of current month.
 * If date >= 25, cycle is 25th of current month to 24th of next month.
 * @param {Date|string} dateInput
 * @returns {{ start: string, end: string, anchorMonth: Date }}
 */
export function getPayCycle(dateInput = new Date()) {
  const d = new Date(dateInput);
  let start, end, anchorMonth;

  if (d.getDate() >= 25) {
    start = new Date(d.getFullYear(), d.getMonth(), 25);
    end = new Date(d.getFullYear(), d.getMonth() + 1, 24, 23, 59, 59, 999);
    anchorMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  } else {
    start = new Date(d.getFullYear(), d.getMonth() - 1, 25);
    end = new Date(d.getFullYear(), d.getMonth(), 24, 23, 59, 59, 999);
    anchorMonth = new Date(d.getFullYear(), d.getMonth(), 1);
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    anchorMonth,
  };
}

/**
 * Get the full month name for a date (e.g. "January").
 * @param {Date} [date] – defaults to today
 * @returns {string}
 */
export function getMonthName(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long' });
}

/**
 * Combine CSS class names, filtering out falsy values.
 * @param {...(string|false|null|undefined)} classes
 * @returns {string}
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

/**
 * Generate a v4 UUID, falling back to a simple random ID when
 * crypto.randomUUID is unavailable (e.g. non-secure contexts).
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: 8-4-4-4-12 hex pattern
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Return a human-readable relative time string.
 * "Today", "Yesterday", "3 days ago", etc.
 * @param {string} dateString
 * @returns {string}
 */
export function getRelativeTime(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 60) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Calculate the "safe to spend" amount for the current period.
 *
 * safe-to-spend = total paychecks − total goal allocations − total expenses
 *
 * @param {Array<{ amount: number }>} paychecks
 * @param {Array<{ amount: number }>} goalAllocations
 * @param {Array<{ amount: number }>} expenses
 * @returns {number}
 */
export function calculateSafeToSpend(paychecks = [], goalAllocations = [], expenses = []) {
  const totalIncome = paychecks.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAllocated = goalAllocations.reduce((sum, g) => sum + Number(g.amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return totalIncome - totalAllocated - totalExpenses;
}
