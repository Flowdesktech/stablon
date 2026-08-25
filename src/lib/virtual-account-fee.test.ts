import { afterEach, describe, expect, it } from "vitest";
import { shouldChargeVirtualAccountFee } from "@/lib/virtual-account-fee";

const originalValue = process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE;

afterEach(() => {
  if (originalValue === undefined) {
    delete process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE;
  } else {
    process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE = originalValue;
  }
});

describe("virtual account fee configuration", () => {
  it("defaults to disabled", () => {
    delete process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE;
    expect(shouldChargeVirtualAccountFee()).toBe(false);
  });

  it("is enabled only when explicitly set to true", () => {
    process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE = " true ";
    expect(shouldChargeVirtualAccountFee()).toBe(true);

    process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE = "false";
    expect(shouldChargeVirtualAccountFee()).toBe(false);
  });
});
