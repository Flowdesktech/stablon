import { getAdminDb } from "@/lib/firebase/admin";

// Shape of the Firestore `users/{uid}` document. Identity (email/password) is
// owned by Firebase Auth; this document holds app-specific profile state.
export interface UserDoc {
  uid: string;
  email: string;
  name: string | null;
  bridgeCustomerId: string | null;
  kycStatus: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorRecoveryCodes: string | null;
  // Hashed app-lock passcode (salt:hash). null when the inactivity lock is off.
  appLockHash: string | null;
  // Grants access to the admin area. Set manually in Firestore for trusted staff.
  superAdmin: boolean;
}

const COLLECTION = "users";

function docRef(uid: string) {
  return getAdminDb().collection(COLLECTION).doc(uid);
}

function withDefaults(uid: string, data: Record<string, unknown>): UserDoc {
  return {
    uid,
    email: (data.email as string) ?? "",
    name: (data.name as string) ?? null,
    bridgeCustomerId: (data.bridgeCustomerId as string) ?? null,
    kycStatus: (data.kycStatus as string) ?? "none",
    twoFactorEnabled: Boolean(data.twoFactorEnabled),
    twoFactorSecret: (data.twoFactorSecret as string) ?? null,
    twoFactorRecoveryCodes: (data.twoFactorRecoveryCodes as string) ?? null,
    appLockHash: (data.appLockHash as string) ?? null,
    superAdmin: Boolean(data.superAdmin),
  };
}

export async function getUserDoc(uid: string): Promise<UserDoc | null> {
  const snap = await docRef(uid).get();
  if (!snap.exists) return null;
  return withDefaults(uid, snap.data() ?? {});
}

// Creates the user document on first sign-in/registration if it doesn't exist,
// then returns the current document.
export async function ensureUserDoc(
  uid: string,
  defaults: { email: string; name?: string | null }
): Promise<UserDoc> {
  const ref = docRef(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    const base = {
      email: defaults.email,
      name: defaults.name ?? defaults.email.split("@")[0],
      bridgeCustomerId: null,
      kycStatus: "none",
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorRecoveryCodes: null,
      appLockHash: null,
      superAdmin: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set(base);
    return withDefaults(uid, base);
  }
  return withDefaults(uid, snap.data() ?? {});
}

export async function updateUserDoc(
  uid: string,
  data: Partial<Omit<UserDoc, "uid">>
): Promise<void> {
  await docRef(uid).set(
    { ...data, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}
