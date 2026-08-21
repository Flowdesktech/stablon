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
  default: { icon: Info, accent: "border-border", iconColor: "text-muted-foreground" },
  success: { icon: CheckCircle2, accent: "border-success/30", iconColor: "text-success" },
  error: { icon: AlertCircle, accent: "border-danger/30", iconColor: "text-danger" },
  info: { icon: Info, accent: "border-info/30", iconColor: "text-info" },
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
              "toast-root pointer-events-auto relative flex w-full items-start gap-3 rounded-lg border bg-surface p-4 text-foreground shadow-[var(--shadow-md)]",
              config.accent
            )}
          >
            <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />
            <div className="flex-1 min-w-0">
              <ToastPrimitive.Title className="text-sm font-medium text-foreground">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-1 break-words text-xs text-muted-foreground">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-subtle hover:text-foreground"
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
