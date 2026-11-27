"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Supabase is not configured in this environment.");
      return;
    }

    setLoading(true);
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        },
      );
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F1] px-4 py-12">
      <div className="agri-card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#173D32]">Reset your password</h1>
        <p className="mt-1.5 text-sm text-[#718078]">
          Enter your registered email address and we will send a password reset
          link.
        </p>

        {sent ? (
          <div className="mt-5 rounded-lg border border-[#1F6B48]/30 bg-[#1F6B48]/10 p-4 text-xs leading-relaxed text-[#173D32]">
            If an account exists for <strong>{email}</strong>, a password reset
            email has been dispatched. Check your inbox and follow the link.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {errorMsg && (
              <div className="rounded-lg border border-[#B83B3B]/30 bg-[#B83B3B]/10 px-3 py-2 text-xs text-[#B83B3B]">
                {errorMsg}
              </div>
            )}
            <div>
              <label
                htmlFor="forgot-email"
                className="mb-1.5 block text-xs font-semibold text-[#242B31]"
              >
                Email Address
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="agri-input"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#173D32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#244638] disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Reset Link
            </button>
          </form>
        )}

        <div className="mt-5 border-t border-[#E4E8E2] pt-4 text-center">
          <Link
            href="/login"
            className="text-xs font-semibold text-[#173D32] hover:underline"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

