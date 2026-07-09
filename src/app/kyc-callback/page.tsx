"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

// Landing page Bridge redirects to after Terms-of-Service acceptance. It relays
// the `signed_agreement_id` back to the window that opened it (the /verify form)
// via postMessage, then closes itself.
export default function KycCallbackPage() {
  const [status, setStatus] = useState<"working" | "done" | "error">("working");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signedAgreementId =
      params.get("signed_agreement_id") || params.get("signedAgreementId");

    if (signedAgreementId && window.opener) {
      window.opener.postMessage(
        { type: "bridge-tos-accepted", signedAgreementId },
        window.location.origin
      );
      setStatus("done");
      setTimeout(() => window.close(), 1200);
    } else {
      setStatus(signedAgreementId ? "done" : "error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        {status === "working" && (
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h1 className="text-lg font-semibold text-white">Terms accepted</h1>
            <p className="text-white/50 text-sm">
              You can close this window and return to verification.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
            <p className="text-white/50 text-sm">
              We couldn&apos;t confirm your acceptance. Please close this window and
              try again.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
