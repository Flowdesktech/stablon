import "server-only";
import { createHash } from "crypto";
import { getAdminDb } from "@/lib/firebase/admin";

const BUCKET_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;

function requestIp(request: Request): string {
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0].trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  return request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip") || "unknown";
}

function configuredLimit(): number {
  const value = Number(process.env.INVOICE_GENERATOR_RATE_LIMIT || DEFAULT_LIMIT);
  if (!Number.isInteger(value)) return DEFAULT_LIMIT;
  return Math.min(100, Math.max(1, value));
}

function hashIp(ip: string): string {
  const salt = process.env.INVOICE_RATE_LIMIT_SALT || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function consumeAnonymousPdfLimit(
  request: Request
): Promise<{ allowed: boolean; limit: number; remaining: number; retryAfter: number }> {
  const timestamp = Date.now();
  const bucket = Math.floor(timestamp / BUCKET_MS);
  const retryAfter = Math.max(1, Math.ceil(((bucket + 1) * BUCKET_MS - timestamp) / 1000));
  const limit = configuredLimit();
  const documentId = `${bucket}_${hashIp(requestIp(request))}`;
  const ref = getAdminDb().collection("invoiceGeneratorRateLimits").doc(documentId);

  return getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = Number(snapshot.data()?.count || 0);
    if (count >= limit) {
      return { allowed: false, limit, remaining: 0, retryAfter };
    }

    const nextCount = count + 1;
    transaction.set(
      ref,
      {
        count: nextCount,
        bucket,
        bucketStartedAt: new Date(bucket * BUCKET_MS),
        expiresAt: new Date((bucket + 48) * BUCKET_MS),
        updatedAt: new Date(),
      },
      { merge: true }
    );
    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - nextCount),
      retryAfter,
    };
  });
}
