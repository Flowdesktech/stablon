"use client";

// TEMPORARY visual harness for the Combobox / CountrySelect dropdown. Delete.

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CountrySelect, Combobox } from "@/components/ui/country-select";

const OCCUPATIONS = [
  { value: "accountant_and_auditor", label: "Accountant and auditor" },
  { value: "actor", label: "Actor" },
  { value: "architect", label: "Architect" },
  { value: "software_developer", label: "Software developer" },
  { value: "teacher", label: "Teacher" },
  { value: "nurse", label: "Nurse" },
  { value: "chef", label: "Chef" },
  { value: "pilot", label: "Pilot" },
];

export default function ComboboxTestPage() {
  const [country, setCountry] = useState("UKR");
  const [occupation, setOccupation] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Spacer so the page scrolls and the occupation field lands near the
            viewport bottom, matching the real verify page. */}
        <div className="h-[800px] flex items-center justify-center text-white/20 text-sm">
          scroll down
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Government photo ID</CardTitle>
            <CardDescription>Provide your ID details and a photo of the front.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1">
                Issuing country
              </label>
              <CountrySelect value={country} onChange={setCountry} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1">
                Document number
              </label>
              <input className="w-full h-10 rounded-lg bg-white/[0.03] border border-white/10 px-3 text-sm text-white" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">A few quick questions</CardTitle>
            <CardDescription>Bridge needs these to finish verifying you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wide text-white/40 mb-1">
                Occupation (optional)
              </label>
              <Combobox
                value={occupation}
                onChange={setOccupation}
                options={OCCUPATIONS}
                placeholder="Select occupation…"
                searchPlaceholder="Type to search occupations…"
              />
            </div>
          </CardContent>
        </Card>

        <button className="w-full h-11 rounded-xl bg-purple-600 text-white text-sm font-medium">
          Finish verification
        </button>
      </div>
    </div>
  );
}
