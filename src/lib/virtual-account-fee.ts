export function shouldChargeVirtualAccountFee(): boolean {
  return process.env.SHOULD_CHARGE_VIRTUAL_ACCOUNT_FEE?.trim().toLowerCase() === "true";
}
