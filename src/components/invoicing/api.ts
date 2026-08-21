"use client";

import useSWR, { type SWRConfiguration } from "swr";

type ApiEnvelope<T> = T | { data: T } | { error?: string; message?: string };

export async function invoicingRequest<T>(
  url: string,
  init?: RequestInit,
  keys: string[] = []
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init?.headers,
  });
  const body = (await response.json().catch(() => ({}))) as ApiEnvelope<T> &
    Record<string, unknown>;

  if (!response.ok) {
    const message =
      ("error" in body && typeof body.error === "string" && body.error) ||
      ("message" in body && typeof body.message === "string" && body.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  if ("data" in body) return body.data as T;
  for (const key of keys) {
    if (key in body) return body[key] as T;
  }
  return body as T;
}

export function useInvoicingData<T>(
  url: string | null,
  keys: string[] = [],
  config?: SWRConfiguration<T>
) {
  return useSWR<T>(
    url,
    (path: string) => invoicingRequest<T>(path, undefined, keys),
    config
  );
}

export function jsonBody(value: unknown): RequestInit {
  return { body: JSON.stringify(value) };
}
