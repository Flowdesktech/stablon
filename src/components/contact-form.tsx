"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { Loader2, Send, CheckCircle2 } from "lucide-react";

export function ContactForm({ initialEmail = "" }: { initialEmail?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Couldn't send your message");
      }
      setSent(true);
      toast({
        variant: "success",
        title: "Message sent",
        description: "We'll reply by email after reviewing your request.",
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Couldn't send your message",
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Card role="status" className="overflow-hidden">
        <CardContent className="flex min-h-80 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-success-muted">
            <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
          </div>
          <p className="font-semibold text-foreground">Message received</p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            We&apos;ll reply to <span className="font-medium text-foreground">{email}</span> after
            reviewing your message.
          </p>
          <Button
            variant="outline"
            className="mt-2"
            onClick={() => {
              setSent(false);
              setMessage("");
            }}
          >
            Send another message
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border bg-surface-muted">
        <CardTitle className="text-lg">Send a message</CardTitle>
        <CardDescription>
          All fields are required. We&apos;ll use your email only to respond to this request.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="text-sm font-medium text-foreground">
                Name
              </label>
              <Input
                id="contact-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5"
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="contact-message" className="text-sm font-medium text-foreground">
              Message
            </label>
            <Textarea
              id="contact-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you need help with."
              className="mt-1.5 min-h-36 resize-y"
              required
            />
          </div>
          <div className="rounded-md border border-border bg-surface-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            Do not include passwords, authentication codes, private keys, or full payment
            credentials.
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            By submitting this form, you acknowledge that your information will be handled as
            described in our{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
          <Button type="submit" className="w-full sm:w-auto" disabled={sending} aria-busy={sending}>
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" /> Send message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
