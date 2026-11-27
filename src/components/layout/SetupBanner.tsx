import React from "react";
import { AlertTriangle, Terminal } from "lucide-react";

interface SetupBannerProps {
  title?: string;
  context?: string;
}

export function SetupBanner({
  title = "Supabase Environment Configuration Required",
  context = "Authentication, live database queries, and real-time messaging require your Supabase project credentials.",
}: SetupBannerProps) {
  return (
    <div className="agri-card mx-auto my-8 max-w-2xl border-[#D5A45B]/50 p-6 sm:p-8">
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#D5A45B]/15 text-[#8A611E]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-bold text-[#242B31]">{title}</h2>
            <p className="mt-1 text-sm text-[#718078]">{context}</p>
          </div>
          <div className="rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] p-4 text-xs text-[#242B31]">
            <div className="mb-2 flex items-center gap-1.5 font-semibold text-[#173D32]">
              <Terminal className="h-3.5 w-3.5" />
              <span>Add to .env.local and restart the dev server</span>
            </div>
            <pre className="overflow-x-auto font-mono leading-relaxed text-[#242B31]">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-anon-key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=optional-browser-maps-key
GOOGLE_MAPS_ROUTES_API_KEY=optional-server-routes-key`}
            </pre>
          </div>
          <p className="text-xs text-[#718078]">
            After configuring <code className="rounded bg-[#F4F5F1] px-1 py-0.5">.env.local</code>, apply the SQL migrations inside{" "}
            <code className="rounded bg-[#F4F5F1] px-1 py-0.5">supabase/migrations/</code> as documented in{" "}
            <code className="rounded bg-[#F4F5F1] px-1 py-0.5">supabase/README.md</code>.
          </p>
        </div>
      </div>
    </div>
  );
}

