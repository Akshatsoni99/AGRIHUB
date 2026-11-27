"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg("Supabase is not configured.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      toast.success("Password updated successfully");
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F5F1] px-4 py-12">
      <div className="agri-card w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-bold text-[#173D32]">Set a new password</h1>
        <p className="mt-1.5 text-sm text-[#718078]">
          Choose a strong password for your AGRIHUB account.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="rounded-lg border border-[#B83B3B]/30 bg-[#B83B3B]/10 px-3 py-2 text-xs text-[#B83B3B]">
              {errorMsg}
            </div>
          )}
          <div>
            <label
              htmlFor="new-password"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="agri-input"
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1.5 block text-xs font-semibold text-[#242B31]"
            >
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
              <KeyRound className="h-4 w-4" />
            )}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

