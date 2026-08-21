"use client";

import { useEffect } from "react";
import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { initializeFirebaseAnalytics } from "@/lib/firebase/client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    void initializeFirebaseAnalytics();
  }, []);

  return (
    <ThemeProvider>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </SWRConfig>
    </ThemeProvider>
  );
}
