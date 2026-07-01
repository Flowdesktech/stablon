"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X, type LucideIcon } from "lucide-react";

export type ToastVariant = "default" | "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

let listeners: Array<(t: ToastItem) => void> = [];
let counter = 0;

// Global toast emitter — callable from components, hooks, or plain helpers.
export function toast(opts: ToastOptions) {
  const item: ToastItem = {
    id: ++counter,
    variant: "default",
    duration: 5000,
    ...opts,
  };
  listeners.forEach((l) => l(item));
}

const variantConfig: Record<ToastVariant, { icon: LucideIcon; accent: string; iconColor: string }> = {
  default: { icon: Info, accent: "border-white/10", iconColor: "text-white/70" },
  success: { icon: CheckCircle2, accent: "border-emerald-500/30", iconColor: "text-emerald-400" },
  error: { icon: AlertCircle, accent: "border-red-500/30", iconColor: "text-red-400" },
  info: { icon: Info, accent: "border-purple-500/30", iconColor: "text-purple-400" },
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (t: ToastItem) => setToasts((prev) => [...prev, t]);
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {toasts.map((t) => {
        const config = variantConfig[t.variant ?? "default"];
        const Icon = config.icon;
        return (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration}
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
            className={cn(
              "toast-root pointer-events-auto relative flex items-start gap-3 w-full rounded-xl border bg-[#14141c] p-4 shadow-lg shadow-black/40",
              config.accent
            )}
          >
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-medium text-white">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="text-xs text-white/50 mt-1 break-words">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              className="shrink-0 rounded-md p-1 text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(calc(100vw-2rem),22rem)] outline-none" />
    </ToastPrimitive.Provider>
  );
}
