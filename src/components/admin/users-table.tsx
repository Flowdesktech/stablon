"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { useProfile } from "@/hooks/use-profile";
import {
  deleteAdminUser,
  impersonateUser,
  setUserLoginDisabled,
} from "@/lib/admin-actions";
import {
  Users,
  Inbox,
  Loader2,
  ShieldCheck,
  MoreHorizontal,
  Eye,
  Trash2,
  LogIn,
  Ban,
  CircleCheck,
} from "lucide-react";

interface AdminUser {
  uid: string;
  email: string;
  name: string | null;
  kycStatus: string;
  bridgeCustomerId: string | null;
  twoFactorEnabled: boolean;
  appLockEnabled: boolean;
  superAdmin: boolean;
  loginDisabled: boolean;
  createdAt: string | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
};

function kycVariant(status: string) {
  switch (status) {
    case "approved":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
}

export function AdminUsersTable() {
  const { data, error, isLoading, mutate } = useSWR<{ data: AdminUser[] }>(
    "/api/admin/users",
    fetcher
  );
  const { profile } = useProfile();
  const users = data?.data ?? [];

  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [impersonatingUid, setImpersonatingUid] = useState<string | null>(null);
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  async function handleToggleLogin(user: AdminUser) {
    const next = !user.loginDisabled;
    setTogglingUid(user.uid);
    try {
      await setUserLoginDisabled(user.uid, next);
      toast({
        variant: next ? "info" : "success",
        title: next ? "Login disabled" : "Login enabled",
        description: next
          ? `${user.email} can no longer sign in. You can still impersonate them.`
          : `${user.email} can sign in again.`,
      });
      mutate();
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't update login access",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setTogglingUid(null);
    }
  }

  async function handleImpersonate(user: AdminUser) {
    setImpersonatingUid(user.uid);
    try {
      await impersonateUser(user.uid);
      toast({
        variant: "success",
        title: "Signed in as user",
        description: `You are now browsing as ${user.email}.`,
      });
      // Hard reload so every cached hook re-fetches under the new session.
      window.location.href = "/dashboard";
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't log in as user",
        description: err instanceof Error ? err.message : "Please try again.",
      });
      setImpersonatingUid(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminUser(deleteTarget.uid);
      toast({
        variant: "success",
        title: "User deleted",
        description: `${deleteTarget.email} has been removed.`,
      });
      setDeleteTarget(null);
      mutate();
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't delete user",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/50 mt-0.5">
            {isLoading
              ? "Loading…"
              : `${users.length} registered user${users.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {error ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-red-300">
            {error.message}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16 text-white/40">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
            <Inbox className="w-8 h-8 text-white/20" />
            <p className="text-white/50 text-sm">No users yet.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">KYC</th>
                  <th className="px-4 py-3 font-medium">Security</th>
                  <th className="px-4 py-3 font-medium">Bridge customer</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.uid === profile?.uid;
                  return (
                    <tr
                      key={u.uid}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <p className="text-white font-medium flex items-center gap-1.5">
                          {u.name || u.email.split("@")[0]}
                          {u.superAdmin && (
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                          )}
                        </p>
                        <p className="text-xs text-white/40">{u.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={kycVariant(u.kycStatus)}>{u.kycStatus}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {u.loginDisabled && (
                            <Badge variant="danger">Login disabled</Badge>
                          )}
                          {u.twoFactorEnabled && <Badge variant="secondary">2FA</Badge>}
                          {u.appLockEnabled && (
                            <Badge variant="secondary">Passcode</Badge>
                          )}
                          {!u.loginDisabled &&
                            !u.twoFactorEnabled &&
                            !u.appLockEnabled && (
                              <span className="text-white/30 text-xs">—</span>
                            )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.bridgeCustomerId ? (
                          <span className="font-mono text-xs text-white/60">
                            {u.bridgeCustomerId}
                          </span>
                        ) : (
                          <span className="text-white/30 text-xs">Not linked</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs whitespace-nowrap">
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isSelf || impersonatingUid !== null}
                            title={
                              isSelf
                                ? "You're already this user"
                                : "Sign in as this user"
                            }
                            onClick={() => handleImpersonate(u)}
                          >
                            {impersonatingUid === u.uid ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            Log in as user
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer outline-none"
                                aria-label="Open actions menu"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onSelect={() => setViewUser(u)}>
                                <Eye className="w-4 h-4" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isSelf || togglingUid !== null}
                                onSelect={() => {
                                  if (!isSelf) handleToggleLogin(u);
                                }}
                              >
                                {u.loginDisabled ? (
                                  <>
                                    <CircleCheck className="w-4 h-4" /> Enable login
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-4 h-4" /> Disable login
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="danger"
                                disabled={isSelf}
                                onSelect={() => {
                                  if (!isSelf) setDeleteTarget(u);
                                }}
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* View details */}
      <Dialog open={!!viewUser} onOpenChange={(open) => !open && setViewUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
            <DialogDescription>
              {viewUser?.name || viewUser?.email}
            </DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-2 text-sm">
              <DetailLine label="Name" value={viewUser.name || "—"} />
              <DetailLine label="Email" value={viewUser.email} />
              <DetailLine label="User ID" value={viewUser.uid} mono />
              <DetailLine label="KYC status" value={viewUser.kycStatus} />
              <DetailLine
                label="Bridge customer"
                value={viewUser.bridgeCustomerId || "Not linked"}
                mono={!!viewUser.bridgeCustomerId}
              />
              <DetailLine
                label="Two-factor"
                value={viewUser.twoFactorEnabled ? "Enabled" : "Disabled"}
              />
              <DetailLine
                label="App lock"
                value={viewUser.appLockEnabled ? "Enabled" : "Disabled"}
              />
              <DetailLine
                label="Role"
                value={viewUser.superAdmin ? "Super admin" : "Member"}
              />
              <DetailLine
                label="Login"
                value={viewUser.loginDisabled ? "Disabled" : "Enabled"}
              />
              <DetailLine
                label="Joined"
                value={
                  viewUser.createdAt
                    ? new Date(viewUser.createdAt).toLocaleString()
                    : "—"
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="text-white">{deleteTarget?.email}</span> and their
              profile. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" /> Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailLine({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-white/40">{label}</span>
      <span
        className={`text-white text-right break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
