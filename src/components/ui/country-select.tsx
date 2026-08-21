"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { country } from "@koshmoney/countries";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

const PANEL_MAX_HEIGHT = 288; // search box + ~6 rows
const GAP = 4;

interface PanelPosition {
  left: number;
  width: number;
  top: number;
  maxHeight: number;
}

/**
 * Generic searchable combobox.
 *
 * The panel is rendered in a portal with fixed positioning: the cards it lives
 * in use `backdrop-blur`, which creates a stacking context, so an absolutely
 * positioned panel could never paint above sibling cards no matter its
 * z-index. It also flips above the trigger when there isn't room below.
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [position, setPosition] = useState<PanelPosition | null>(null);
  const listboxId = useId();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const reposition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - GAP * 2;
    const spaceAbove = rect.top - GAP * 2;
    // Prefer dropping down, but flip above the trigger when the panel doesn't
    // fully fit below and there's more room above — which is the case for
    // fields near the bottom of the page.
    const flipUp = spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, Math.min(PANEL_MAX_HEIGHT, flipUp ? spaceAbove : spaceBelow));
    setPosition({
      left: rect.left,
      width: rect.width,
      top: flipUp ? rect.top - GAP - maxHeight : rect.bottom + GAP,
      maxHeight,
    });
  }, []);

  // Measure before paint so the panel never flashes in the wrong spot.
  useLayoutEffect(() => {
    if (open) reposition();
  }, [open, reposition]);

  // Follow the trigger while the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open, reposition]);

  // Close on outside click (the panel is portalled, so check it separately).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Keep the highlighted option in view while arrow-keying.
  useEffect(() => {
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  function select(o: ComboboxOption) {
    onChange(o.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtered[highlight];
      if (o) select(o);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-label={selected ? `Selected: ${selected.label}` : placeholder}
        onClick={() => {
          if (!open) {
            setQuery("");
            setHighlight(0);
          }
          setOpen((value) => !value);
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
            e.preventDefault();
            setQuery("");
            setHighlight(0);
            setOpen(true);
          }
        }}
        className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-foreground shadow-[var(--shadow-sm)] outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
      >
        <span className={selected ? "truncate text-foreground" : "truncate text-muted-foreground"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              left: position.left,
              top: position.top,
              width: position.width,
              maxHeight: position.maxHeight,
            }}
            className="z-[9999] flex flex-col overflow-hidden rounded-md border border-border bg-surface text-foreground shadow-[var(--shadow-md)]"
          >
            <div className="shrink-0 border-b border-border p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setHighlight(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-md border border-border-strong bg-surface px-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-focus focus:ring-2 focus:ring-focus/20"
              />
            </div>
            <ul id={listboxId} ref={listRef} role="listbox" className="flex-1 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-muted-foreground">No matches found</li>
              ) : (
                filtered.map((o, i) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value === o.value}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => select(o)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-2 text-sm text-left",
                        i === highlight ? "bg-info-muted text-info" : "text-foreground"
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {value === o.value && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  );
}

// Built once from the ISO 3166-1 list; shared by every CountrySelect instance.
const COUNTRIES: ComboboxOption[] = country
  .all()
  .map((c) => ({ value: c.alpha3, label: `${c.name} (${c.alpha3})` }))
  .sort((a, b) => a.label.localeCompare(b.label));

/**
 * Country picker. The controlled value is the ISO 3166-1 alpha-3 code (what
 * Bridge expects); the user searches by country name or code.
 */
export function CountrySelect({
  value,
  onChange,
  placeholder = "Select country…",
  className,
}: {
  value: string;
  onChange: (alpha3: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Combobox
      value={value}
      onChange={onChange}
      options={COUNTRIES}
      placeholder={placeholder}
      searchPlaceholder="Type a country or code…"
      className={className}
    />
  );
}
