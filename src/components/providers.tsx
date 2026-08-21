"use client";

import { SWRConfig } from "swr";
import { Toaster } from "@/components/ui/toast";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
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
