"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Truck, UserPlus, Package } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AccountRole } from "@/types/domain";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ROLE_OPTIONS: {
  id: AccountRole;
  title: string;
  description: string;
  icon: typeof Truck;
}[] = [
  {
    id: "shipper",
    title: "Shipper / Producer",
    description: "Find vehicles and book shared space for agricultural or trade goods.",
    icon: Package,
  },
  {
    id: "transporter",
    title: "Transporter / Operator",
    description: "Publish available vehicle capacity along planned routes.",
    icon: Truck,
  },
  {
    id: "both",
    title: "Both Roles",
    description: "List spare truck capacity and also request space for shipments.",
    icon: CheckCircle2,
  },
];

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [accountType, setAccountType] = useState<AccountRole>("both");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Supabase environment variables are not configured.");
      return;
    }

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            mobile_number: mobileNumber.trim(),
            city: city.trim(),
            state: state.trim(),
            business_name: businessName.trim() || null,
            account_type: accountType,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      let activeSession = data.session;

      // If signUp did not return an immediate session, attempt direct sign-in
      if (!activeSession) {
        const { data: signInData, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
        if (signInErr || !signInData.session) {
          setErrorMsg(
            "Account created, but your Supabase project currently requires email confirmation before signing in. Disable 'Confirm email' in Supabase Dashboard -> Authentication -> Providers -> Email.",
          );
          return;
        }
        activeSession = signInData.session;
      }

      // Ensure profile onboarding fields and private contact are saved
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: activeSession.user.id,
          full_name: fullName.trim(),
          city: city.trim(),
          state: state.trim(),
          business_name: businessName.trim() || null,
          account_type: accountType,
          onboarding_completed: true,
        });

      if (profileErr) {
        setErrorMsg(profileErr.message);
        return;
      }

      const { error: contactErr } = await supabase
        .from("profile_private_contacts")
        .upsert({
          user_id: activeSession.user.id,
          email: email.trim(),
          mobile_number: mobileNumber.trim(),
        });

      if (contactErr) {
        setErrorMsg(contactErr.message);
        return;
      }

      toast.success("Account created! Welcome to AGRIHUB.");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg border border-[#B83B3B]/30 bg-[#B83B3B]/10 px-3.5 py-2.5 text-xs font-medium text-[#B83B3B]"
        >
          {errorMsg}
        </div>
      )}

      <div>
        <span className="mb-2 block text-xs font-semibold text-[#242B31]">
          Select Account Mode
        </span>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {ROLE_OPTIONS.map((role) => {
            const Icon = role.icon;
            const selected = accountType === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setAccountType(role.id)}
                className={cn(
                  "flex flex-col items-start rounded-lg border p-3 text-left transition",
                  selected
                    ? "border-[#173D32] bg-[#173D32]/5 ring-1 ring-[#173D32]"
                    : "border-[#E4E8E2] bg-white hover:bg-[#F4F5F1]",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    selected ? "text-[#173D32]" : "text-[#718078]",
                  )}
                />
                <span className="mt-2 text-xs font-bold text-[#242B31]">
                  {role.title}
                </span>
                <span className="mt-1 text-[11px] leading-snug text-[#718078]">
                  {role.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="signup-name"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Full Name *
          </label>
          <input
            id="signup-name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ramesh Kulkarni"
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="signup-business"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Business / FPO Name (Optional)
          </label>
          <input
            id="signup-business"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Kaveri Agro Traders"
            className="agri-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="signup-email"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Email Address *
          </label>
          <input
            id="signup-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ramesh@example.com"
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="signup-mobile"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            Mobile Number * (Kept Private)
          </label>
          <input
            id="signup-mobile"
            type="tel"
            required
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="+91 98765 43210"
            className="agri-input"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="signup-city"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            City / Town *
          </label>
          <input
            id="signup-city"
            type="text"
            required
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Nashik"
            className="agri-input"
          />
        </div>
        <div>
          <label
            htmlFor="signup-state"
            className="mb-1.5 block text-xs font-semibold text-[#242B31]"
          >
            State *
          </label>
          <input
            id="signup-state"
            type="text"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Maharashtra"
            className="agri-input"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="signup-password"
          className="mb-1.5 block text-xs font-semibold text-[#242B31]"
        >
          Password * (Minimum 8 characters)
        </label>
        <input
          id="signup-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a strong password"
          className="agri-input"
        />
      </div>

      <p className="text-[11px] text-[#718078]">
        Your mobile number is never displayed on public pools. It is shared only
        with confirmed deal counterparties.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#173D32] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#244638] disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {loading ? "Creating account..." : "Create AGRIHUB Account"}
      </button>
    </form>
  );
}

