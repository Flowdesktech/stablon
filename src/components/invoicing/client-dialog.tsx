"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  Field,
  SubmitButton,
  selectClassName,
} from "@/components/invoicing/invoice-ui";
import { invoicingRequest, jsonBody } from "@/components/invoicing/api";
import type { InvoiceClient, InvoiceProfile } from "@/types/invoicing";

export function ClientDialog({
  open,
  onOpenChange,
  client,
  profiles,
  initialProfileId,
  lockProfile = false,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: InvoiceClient | null;
  profiles: InvoiceProfile[];
  initialProfileId?: string;
  lockProfile?: boolean;
  onSaved: (client: InvoiceClient) => void | Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [street2, setStreet2] = useState("");
  const [city, setCity] = useState("");
  const [subdivision, setSubdivision] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("United States");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setProfileId(
      client?.profileId ||
        initialProfileId ||
        profiles.find((profile) => profile.isDefault)?.id ||
        profiles[0]?.id ||
        ""
    );
    setName(client?.name || "");
    setCompany(client?.company || "");
    setEmail(client?.email || "");
    setPhone(client?.phone || "");
    setStreet(client?.address.street || "");
    setStreet2(client?.address.street2 || "");
    setCity(client?.address.city || "");
    setSubdivision(client?.address.subdivision || "");
    setPostalCode(client?.address.postalCode || "");
    setCountry(client?.address.country || "United States");
    setNotes(client?.notes || "");
  }, [client, initialProfileId, open, profiles]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    setSaving(true);
    try {
      const payload = {
        profileId,
        name,
        company: company || undefined,
        email,
        phone: phone || undefined,
        address: {
          street,
          street2: street2 || undefined,
          city,
          subdivision: subdivision || undefined,
          postalCode,
          country,
        },
        notes: notes || undefined,
      };
      const saved = await invoicingRequest<InvoiceClient>(
        client ? `/api/invoicing/clients/${client.id}` : "/api/invoicing/clients",
        { method: client ? "PUT" : "POST", ...jsonBody(payload) }
      );
      await onSaved(saved);
      onOpenChange(false);
      toast({
        variant: "success",
        title: client ? "Client updated" : "Client created",
      });
    } catch (error) {
      toast({
        variant: "error",
        title: "Client not saved",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[min(calc(100vw-2rem),42rem)] max-w-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? "Edit client" : "Add client"}</DialogTitle>
          <DialogDescription>
            Save billing and contact details for faster invoice creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Invoice profile" className="sm:col-span-2">
            <select
              className={selectClassName}
              value={profileId}
              disabled={Boolean(client) || lockProfile}
              onChange={(event) => setProfileId(event.target.value)}
              required
            >
              {profiles.map((profile) => (
                <option value={profile.id} key={profile.id}>{profile.name} · {profile.company}</option>
              ))}
            </select>
          </Field>
          <Field label="Name"><Input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="Company"><Input value={company} onChange={(event) => setCompany(event.target.value)} /></Field>
          <Field label="Email"><Input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Phone"><Input value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="Street address" className="sm:col-span-2"><Input value={street} onChange={(event) => setStreet(event.target.value)} /></Field>
          <Field label="Address line 2" className="sm:col-span-2"><Input value={street2} onChange={(event) => setStreet2(event.target.value)} /></Field>
          <Field label="City"><Input value={city} onChange={(event) => setCity(event.target.value)} /></Field>
          <Field label="State / region"><Input value={subdivision} onChange={(event) => setSubdivision(event.target.value)} /></Field>
          <Field label="Postal code"><Input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} /></Field>
          <Field label="Country">
            <Input required minLength={2} maxLength={100} placeholder="United States" value={country} onChange={(event) => setCountry(event.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
          <div className="flex justify-end sm:col-span-2">
            <SubmitButton pending={saving}>{client ? "Save changes" : "Add client"}</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
