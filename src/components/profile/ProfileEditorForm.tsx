"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { profileUpdateSchema } from "@/lib/validators/pool";
import type { AccountRole, PrivateContact, PublicProfile } from "@/types/domain";
import { toast } from "sonner";

interface ProfileEditorFormProps {
  userId: string;
  email: string;
  profile: PublicProfile | null;
  privateContact: PrivateContact | null;
  redirectTo?: string;
  submitLabel?: string;
}

export function ProfileEditorForm({
  userId,
  email,
  profile,
  privateContact,
  redirectTo,
  submitLabel = "Save Profile",
}: ProfileEditorFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [businessName, setBusinessName] = useState(profile?.business_name || "");
  const [mobileNumber, setMobileNumber] = useState(
    privateContact?.mobile_number || "",
  );
  const [city, setCity] = useState(profile?.city || "");
  const [state, setState] = useState(profile?.state || "");
  const [accountType, setAccountType] = useState<AccountRole>(
    profile?.account_type || "both",
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const parsed = profileUpdateSchema.safeParse({
      full_name: fullName,
      mobile_number: mobileNumber,
      city,
      state,
      business_name: businessName || null,
      account_type: accountType,
    });

    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message || "Check your profile fields.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Supabase is not configured.");
      return;
    }

    setSaving(true);
    try {
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          full_name: parsed.data.full_name,
          business_name: parsed.data.business_name || null,
          city: parsed.data.city,
          state: parsed.data.state,
          account_type: parsed.data.account_type,
          onboarding_completed: true,
        });

      if (profileErr) {
        setErrorMsg(profileErr.message);
        return;
      }

      const { error: contactErr } = await supabase
        .from("profile_private_contacts")
        .upsert({
          user_id: userId,
          email,
          mobile_number: parsed.data.mobile_number,
        });

      if (contactErr) {
        setErrorMsg(contactErr.message);
        return;
      }

      toast.success("Profile updated");
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-[#B83B3B]/30 bg-[#B83B3B]/10 px-3.5 py-2.5 text-xs font-medium text-[#B83B3B]"
        >
          {errorMsg}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="prof-name"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Full Name *
          </label>
          <input
            id="prof-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="prof-business"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Business / FPO / Cooperative Name
          </label>
          <input
            id="prof-business"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Optional"
            className="agri-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="prof-email"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Account Email
          </label>
          <input
            id="prof-email"
            type="email"
            value={email}
            disabled
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="prof-mobile"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Mobile Number * (Unlocked only on confirmed deals)
          </label>
          <input
            id="prof-mobile"
            type="tel"
            required
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="+91 98765 43210"
            className="agri-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label
            htmlFor="prof-city"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            City / Town *
          </label>
          <input
            id="prof-city"
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="prof-state"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            State *
          </label>
          <input
            id="prof-state"
            type="text"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="prof-role"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Account Mode *
          </label>
          <select
            id="prof-role"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountRole)}
            className="agri-input"
          >
            <option value="shipper">Shipper</option>
            <option value="transporter">Transporter</option>
            <option value="both">Both (Shipper & Transporter)</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#173D32] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244638] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

