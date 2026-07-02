"use client";

import useSWR from "swr";

export interface Profile {
  uid: string;
  email: string;
  name: string | null;
  kycStatus: string;
  twoFactorEnabled: boolean;
  superAdmin: boolean;
  impersonating: boolean;
}

const fetcher = async (url: string): Promise<Profile> => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

export function useProfile() {
  const { data, error, isLoading, mutate } = useSWR<Profile>("/api/me", fetcher);
  return {
    profile: data,
    isSuperAdmin: Boolean(data?.superAdmin),
    error,
    isLoading,
    mutate,
  };
}
