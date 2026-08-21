"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

// Landing page Bridge redirects to after Terms-of-Service acceptance. It relays
// the `signed_agreement_id` back to the window that opened it (the /verify form)
// via postMessage, then closes itself.
export default function KycCallbackPage() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signedAgreementId =
      params.get("signed_agreement_id") || params.get("signedAgreementId");

    const nextStatus = signedAgreementId ? "done" : "error";
    const statusTimer = window.setTimeout(() => setStatus(nextStatus), 0);
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    if (signedAgreementId && window.opener) {
      window.opener.postMessage(
        { type: "bridge-tos-accepted", signedAgreementId },
        window.location.origin
      );
      closeTimer = setTimeout(() => window.close(), 1200);
    }
    return () => {
      window.clearTimeout(statusTimer);
      if (closeTimer) window.clearTimeout(closeTimer);
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
      <section className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-[var(--shadow-sm)]">
        <div className="mx-auto mb-5 flex h-10 w-10 items-center justify-center rounded-md bg-info-muted">
          <ShieldCheck className="h-5 w-5 text-info" aria-hidden="true" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          Bridge verification
        </p>
        {status === "working" && (
          <div role="status">
            <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-semibold">Confirming acceptance</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Keep this window open while Bridge returns the confirmation.
            </p>
          </div>
        )}
        {status === "done" && (
          <div role="status">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-semibold">Terms accepted</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This confirmation has been sent to Stablon. You can close this window and return to
              verification.
            </p>
          </div>
        )}
        {status === "error" && (
          <div role="alert">
            <AlertCircle className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
            <h1 className="mt-4 text-lg font-semibold">Confirmation unavailable</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              We couldn&apos;t confirm your acceptance. Close this window, return to verification,
              and try again.
            </p>
          </div>
        )}
        <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
          Identity verification and agreement acceptance are provided by Bridge.
        </p>
      </section>
    </main>
  );
}
