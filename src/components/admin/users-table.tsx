"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { DataState, DataView } from "@/components/ui/data-view";
import { PageHeader, StatCard } from "@/components/ui/page";
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
  Loader2,
  ShieldCheck,
  MoreHorizontal,
  Eye,
  Trash2,
  LogIn,
  Ban,
  CircleCheck,
  UserCheck,
  UserX,
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
  const approvedUsers = users.filter((user) => user.kycStatus === "approved").length;
  const disabledUsers = users.filter((user) => user.loginDisabled).length;

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
      window.history.replaceState(null, "", "/dashboard");
      window.location.reload();
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
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Users"
        description="Review customer verification, security, and account access across the platform."
      />

      <div
        className="grid gap-4 sm:grid-cols-3"
        role="group"
        aria-label="User summary"
      >
        <StatCard
          label="Registered users"
          value={isLoading || error ? "—" : users.length}
          detail="All platform accounts"
          icon={<Users className="h-5 w-5" aria-hidden="true" />}
        />
        <StatCard
          label="KYC approved"
          value={isLoading || error ? "—" : approvedUsers}
          detail="Verified customers"
          icon={<UserCheck className="h-5 w-5 text-success" aria-hidden="true" />}
        />
        <StatCard
          label="Login disabled"
          value={isLoading || error ? "—" : disabledUsers}
          detail="Restricted accounts"
          icon={<UserX className="h-5 w-5 text-danger" aria-hidden="true" />}
        />
      </div>

      <DataView>
        {error ? (
          <DataState
            kind="error"
            title="Users could not be loaded"
            description={error.message}
            onRetry={() => mutate()}
          />
        ) : isLoading ? (
          <DataState
            kind="loading"
            title="Loading users"
            description="Retrieving customer accounts and security status."
          />
        ) : users.length === 0 ? (
          <DataState
            title="No users yet"
            description="Registered customer accounts will appear here."
          />
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {users.map((user) => (
                <UserMobileCard
                  key={user.uid}
                  user={user}
                  isSelf={user.uid === profile?.uid}
                  impersonatingUid={impersonatingUid}
                  togglingUid={togglingUid}
                  onView={setViewUser}
                  onToggleLogin={handleToggleLogin}
                  onImpersonate={handleImpersonate}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[960px] text-sm">
                <caption className="sr-only">
                  Registered users, verification, security, and account actions
                </caption>
                <thead className="bg-surface-muted">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-4 py-3 font-medium">User</th>
                    <th scope="col" className="px-4 py-3 font-medium">KYC</th>
                    <th scope="col" className="px-4 py-3 font-medium">Security</th>
                    <th scope="col" className="px-4 py-3 font-medium">Bridge customer</th>
                    <th scope="col" className="px-4 py-3 font-medium">Joined</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((user) => (
                    <UserTableRow
                      key={user.uid}
                      user={user}
                      isSelf={user.uid === profile?.uid}
                      impersonatingUid={impersonatingUid}
                      togglingUid={togglingUid}
                      onView={setViewUser}
                      onToggleLogin={handleToggleLogin}
                      onImpersonate={handleImpersonate}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </DataView>

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
              <span className="font-medium text-foreground">{deleteTarget?.email}</span> and their
              profile. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Alert
            variant="danger"
            title="Permanent account deletion"
            description="The user profile and access will be removed immediately."
          />
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`break-all text-right text-foreground ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

interface UserActionsProps {
  user: AdminUser;
  isSelf: boolean;
  impersonatingUid: string | null;
  togglingUid: string | null;
  onView: (user: AdminUser) => void;
  onToggleLogin: (user: AdminUser) => void;
  onImpersonate: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
}

function UserActions({
  user,
  isSelf,
  impersonatingUid,
  togglingUid,
  onView,
  onToggleLogin,
  onImpersonate,
  onDelete,
}: UserActionsProps) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={isSelf || impersonatingUid !== null}
        title={isSelf ? "You're already this user" : "Sign in as this user"}
        onClick={() => onImpersonate(user)}
      >
        {impersonatingUid === user.uid ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        Log in as user
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground outline-none transition-colors hover:bg-surface-subtle hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus"
            aria-label={`Open actions for ${user.email}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => onView(user)}>
            <Eye className="h-4 w-4" aria-hidden="true" /> View details
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isSelf || togglingUid !== null}
            onSelect={() => {
              if (!isSelf) onToggleLogin(user);
            }}
          >
            {user.loginDisabled ? (
              <>
                <CircleCheck className="h-4 w-4" aria-hidden="true" /> Enable login
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" aria-hidden="true" /> Disable login
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="danger"
            disabled={isSelf}
            onSelect={() => {
              if (!isSelf) onDelete(user);
            }}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete user
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function UserSecurity({ user }: { user: AdminUser }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {user.loginDisabled && <Badge variant="danger">Login disabled</Badge>}
      {user.twoFactorEnabled && <Badge variant="secondary">2FA</Badge>}
      {user.appLockEnabled && <Badge variant="secondary">Passcode</Badge>}
      {!user.loginDisabled && !user.twoFactorEnabled && !user.appLockEnabled && (
        <span className="text-xs text-muted-foreground">No controls enabled</span>
      )}
    </div>
  );
}

function UserTableRow(props: UserActionsProps) {
  const { user } = props;
  return (
    <tr className="transition-colors hover:bg-surface-subtle">
      <td className="px-4 py-3">
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          {user.name || user.email.split("@")[0]}
          {user.superAdmin && (
            <>
              <ShieldCheck className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
              <span className="sr-only">Super admin</span>
            </>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant={kycVariant(user.kycStatus)}>{user.kycStatus}</Badge>
      </td>
      <td className="px-4 py-3"><UserSecurity user={user} /></td>
      <td className="px-4 py-3">
        {user.bridgeCustomerId ? (
          <span className="font-mono text-xs text-muted-foreground">
            {user.bridgeCustomerId}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not linked</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
      </td>
      <td className="px-4 py-3"><UserActions {...props} /></td>
    </tr>
  );
}

function UserMobileCard(props: UserActionsProps) {
  const { user } = props;
  return (
    <article className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 truncate font-medium text-foreground">
            {user.name || user.email.split("@")[0]}
            {user.superAdmin && (
              <>
                <ShieldCheck className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span className="sr-only">Super admin</span>
              </>
            )}
          </h2>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </div>
        <Badge variant={kycVariant(user.kycStatus)}>{user.kycStatus}</Badge>
      </div>
      <UserSecurity user={user} />
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <dt className="text-muted-foreground">Bridge customer</dt>
          <dd className="mt-1 truncate font-mono text-foreground">
            {user.bridgeCustomerId || "Not linked"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Joined</dt>
          <dd className="mt-1 text-foreground">
            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
          </dd>
        </div>
      </dl>
      <UserActions {...props} />
    </article>
  );
}
