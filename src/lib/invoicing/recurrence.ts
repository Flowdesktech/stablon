import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  format,
  getISOWeek,
  getQuarter,
  startOfMonth,
  subMonths,
} from "date-fns";
import type { RecurringFrequency } from "@/types/invoicing";

export function nextRecurringDate(from: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case "weekly":
      return addWeeks(from, 1);
    case "biweekly":
      return addWeeks(from, 2);
    case "monthly":
      return addMonths(from, 1);
    case "quarterly":
      return addQuarters(from, 1);
    case "yearly":
      return addYears(from, 1);
  }
}

function period(invoiceDate: Date, frequency: RecurringFrequency): {
  start: Date;
  end: Date;
} {
  if (frequency === "monthly") {
    const previousMonth = subMonths(invoiceDate, 1);
    return { start: startOfMonth(previousMonth), end: endOfMonth(previousMonth) };
  }
  const days =
    frequency === "weekly"
      ? 6
      : frequency === "biweekly"
        ? 13
        : frequency === "quarterly"
          ? 89
          : 364;
  return { start: addDays(invoiceDate, -days), end: invoiceDate };
}

export function applyRecurringPlaceholders(
  value: string,
  invoiceDate: Date,
  frequency: RecurringFrequency
): string {
  const { start, end } = period(invoiceDate, frequency);
  const monthDate = frequency === "monthly" ? start : end;
  return value
    .replaceAll("{{PERIOD_START}}", format(start, "MMM d"))
    .replaceAll("{{PERIOD_END}}", format(end, "MMM d"))
    .replaceAll("{{MONTH_NAME}}", format(monthDate, "MMMM"))
    .replaceAll("{{MONTH_SHORT}}", format(monthDate, "MMM"))
    .replaceAll("{{YEAR}}", format(monthDate, "yyyy"))
    .replaceAll("{{WEEK_NUMBER}}", String(getISOWeek(end)))
    .replaceAll("{{QUARTER}}", String(getQuarter(monthDate)));
}
