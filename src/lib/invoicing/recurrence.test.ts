import { describe, expect, it } from "vitest";
import { applyRecurringPlaceholders, nextRecurringDate } from "./recurrence";

describe("recurrence calculations", () => {
  it("keeps calendar semantics for monthly schedules", () => {
    const next = nextRecurringDate(new Date("2026-01-31T12:00:00Z"), "monthly");
    expect(next.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("replaces supported invoice description placeholders", () => {
    const value = applyRecurringPlaceholders(
      "Retainer for {{MONTH_NAME}} {{YEAR}} ({{PERIOD_START}}–{{PERIOD_END}})",
      new Date("2026-03-01T12:00:00Z"),
      "monthly"
    );
    expect(value).toBe("Retainer for February 2026 (Feb 1–Feb 28)");
  });
});
