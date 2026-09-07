import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteCookie: vi.fn(),
  verifySessionCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: "invalid-session" })),
    delete: mocks.deleteCookie,
  })),
}));

vi.mock("@/lib/firebase/admin", () => ({
  getAdminAuth: () => ({
    verifySessionCookie: mocks.verifySessionCookie,
  }),
}));

import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE,
  clearSessionCookies,
  getSessionUser,
} from "@/lib/firebase/server-auth";

describe("server authentication cookies", () => {
  beforeEach(() => {
    mocks.deleteCookie.mockReset();
    mocks.verifySessionCookie.mockReset();
  });

  it("does not mutate cookies when verification fails during a read", async () => {
    mocks.verifySessionCookie.mockRejectedValue(new Error("invalid session"));

    await expect(getSessionUser()).resolves.toBeNull();
    expect(mocks.deleteCookie).not.toHaveBeenCalled();
  });

  it("clears both authentication cookies when called from a mutation context", async () => {
    await clearSessionCookies();

    expect(mocks.deleteCookie).toHaveBeenCalledWith(SESSION_COOKIE);
    expect(mocks.deleteCookie).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE);
  });
});
