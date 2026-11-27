"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Handshake,
  Loader2,
  MessageSquare,
  Send,
  Sliders,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { proposeDealTermsSchema } from "@/lib/validators/pool";
import type {
  ChatMessage,
  Conversation,
  PoolRequest,
} from "@/types/domain";
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  formatWeight,
} from "@/lib/utils";
import { toast } from "sonner";

interface MessagesWorkspaceProps {
  currentUserId: string;
  initialConversations: Conversation[];
}

export function MessagesWorkspace({
  currentUserId,
  initialConversations,
}: MessagesWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedConvId = searchParams.get("conversation");

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    requestedConvId &&
      initialConversations.some((c) => c.id === requestedConvId)
      ? requestedConvId
      : initialConversations[0]?.id ?? null,
  );
  const [mobileShowThread, setMobileShowThread] = useState(
    Boolean(requestedConvId),
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadedConvId, setLoadedConvId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Deal terms editing & confirmation
  const [activeRequest, setActiveRequest] = useState<PoolRequest | null>(null);
  const [editingTerms, setEditingTerms] = useState(false);
  const [propCapacity, setPropCapacity] = useState("");
  const [propPrice, setPropPrice] = useState("");
  const [propPickup, setPropPickup] = useState("");
  const [propDrop, setPropDrop] = useState("");
  const [propDeparture, setPropDeparture] = useState("");
  const [propConditions, setPropConditions] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);
  const [confirmingDeal, setConfirmingDeal] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );
  const loadingMessages = Boolean(selectedConv && loadedConvId !== selectedConv.id);

  function openTermsEditor() {
    if (!activeRequest) return;
    setPropCapacity(
      String(
        activeRequest.agreed_capacity_kg ?? activeRequest.required_capacity_kg,
      ),
    );
    setPropPrice(
      String(activeRequest.agreed_price ?? activeRequest.proposed_price),
    );
    setPropPickup(
      activeRequest.agreed_pickup_point ?? activeRequest.pickup_location,
    );
    setPropDrop(activeRequest.agreed_drop_point ?? activeRequest.drop_location);
    setPropDeparture(activeRequest.agreed_departure_time ?? "");
    setPropConditions(activeRequest.agreed_conditions ?? "");
    setEditingTerms(true);
  }

  // Fetch messages & latest request details when selected conversation changes
  useEffect(() => {
    if (!selectedConv) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;

    async function loadThread() {
      if (!supabase || !selectedConv) return;
      const [{ data: msgRows }, { data: reqRow }] = await Promise.all([
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", selectedConv.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("pool_requests")
          .select("*")
          .eq("id", selectedConv.request_id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      setMessages((msgRows as ChatMessage[]) || []);
      setActiveRequest((reqRow as PoolRequest | null) ?? selectedConv.request ?? null);
      setLoadedConvId(selectedConv.id);

      // Mark incoming unread messages as read
      await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", selectedConv.id)
        .neq("sender_id", currentUserId)
        .is("read_at", null);
    }

    loadThread();

    // Realtime subscription for messages & request status changes
    const channel = supabase
      .channel(`conv-thread-${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg],
          );
          if (newMsg.sender_id && newMsg.sender_id !== currentUserId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", newMsg.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pool_requests",
          filter: `id=eq.${selectedConv.request_id}`,
        },
        (payload) => {
          setActiveRequest(payload.new as PoolRequest);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedConv, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv || !messageInput.trim()) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const text = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: selectedConv.id,
        sender_id: currentUserId,
        message_type: "text",
        body: text,
      });

      if (error) {
        toast.error(error.message);
        setMessageInput(text);
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConv.id
              ? { ...c, last_message_at: new Date().toISOString() }
              : c,
          ),
        );
      }
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleProposeTerms(e: React.FormEvent) {
    e.preventDefault();
    if (!activeRequest) return;

    const parsed = proposeDealTermsSchema.safeParse({
      request_id: activeRequest.id,
      agreed_capacity_kg: Number(propCapacity),
      agreed_price: Number(propPrice),
      agreed_pickup_point: propPickup,
      agreed_drop_point: propDrop,
      agreed_departure_time: propDeparture || "As scheduled",
      agreed_conditions: propConditions || null,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || "Check proposed terms.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSavingTerms(true);
    try {
      const { error } = await supabase.rpc("propose_deal_terms", {
        p_request_id: activeRequest.id,
        p_capacity_kg: parsed.data.agreed_capacity_kg,
        p_price: parsed.data.agreed_price,
        p_pickup_point: parsed.data.agreed_pickup_point,
        p_drop_point: parsed.data.agreed_drop_point,
        p_departure_time: parsed.data.agreed_departure_time,
        p_conditions: parsed.data.agreed_conditions,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Updated terms shared in chat. Both parties must confirm.");
      setEditingTerms(false);
      const { data: refreshed } = await supabase
        .from("pool_requests")
        .select("*")
        .eq("id", activeRequest.id)
        .maybeSingle();
      if (refreshed) setActiveRequest(refreshed as PoolRequest);
    } finally {
      setSavingTerms(false);
    }
  }

  async function handleConfirmDeal() {
    if (!activeRequest) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setConfirmingDeal(true);
    try {
      const { data, error } = await supabase.rpc("confirm_deal_terms", {
        p_request_id: activeRequest.id,
        p_expected_terms_version: activeRequest.terms_version,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const result = data as {
        confirmed?: boolean;
        deal_code?: string;
        remaining_capacity_kg?: number;
      };

      if (result?.confirmed) {
        toast.success(
          `Deal ${result.deal_code} confirmed! Capacity reserved atomically.`,
        );
        router.refresh();
      } else {
        toast.info(
          "Your confirmation is recorded. Waiting for the other party to confirm the same terms.",
        );
      }

      const { data: refreshed } = await supabase
        .from("pool_requests")
        .select("*")
        .eq("id", activeRequest.id)
        .maybeSingle();
      if (refreshed) setActiveRequest(refreshed as PoolRequest);
    } finally {
      setConfirmingDeal(false);
    }
  }

  if (conversations.length === 0) {
    return (
      <div className="agri-card flex flex-col items-center justify-center px-6 py-16 text-center">
        <MessageSquare className="mb-3 h-10 w-10 text-[#173D32]" />
        <h2 className="text-base font-bold text-[#242B31]">
          No private conversations yet
        </h2>
        <p className="mt-1.5 max-w-md text-xs text-[#718078]">
          Private messaging opens automatically once a transporter accepts a
          shipper&apos;s join request for discussion.
        </p>
        <Link
          href="/truck-pool/find"
          className="mt-5 rounded-lg bg-[#173D32] px-4 py-2 text-xs font-semibold text-white"
        >
          Explore Open Pools
        </Link>
      </div>
    );
  }

  const isOwnerInConv = selectedConv?.owner_id === currentUserId;
  const userAlreadyConfirmed = activeRequest
    ? isOwnerInConv
      ? activeRequest.owner_confirmed_terms
      : activeRequest.requester_confirmed_terms
    : false;
  const canNegotiate =
    activeRequest &&
    ["ACCEPTED_FOR_DISCUSSION", "NEGOTIATING"].includes(activeRequest.status);

  return (
    <div className="agri-card grid min-h-[640px] overflow-hidden lg:grid-cols-12">
      {/* Left Conversation List */}
      <aside
        className={cn(
          "border-r border-[#E4E8E2] bg-white lg:col-span-4 lg:block",
          mobileShowThread ? "hidden" : "block",
        )}
      >
        <div className="border-b border-[#E4E8E2] px-4 py-3.5">
          <h2 className="text-sm font-bold text-[#173D32]">
            Negotiation Threads ({conversations.length})
          </h2>
        </div>

        <div className="divide-y divide-[#E4E8E2]">
          {conversations.map((conv) => {
            const partner =
              conv.owner_id === currentUserId ? conv.requester : conv.owner;
            const active = conv.id === selectedId;
            return (
              <button
                key={conv.id}
                type="button"
                onClick={() => {
                  setSelectedId(conv.id);
                  setMobileShowThread(true);
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-1 px-4 py-3.5 text-left transition",
                  active
                    ? "bg-[#173D32]/8 border-l-4 border-l-[#173D32]"
                    : "hover:bg-[#F4F5F1]",
                )}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-[#242B31]">
                    {partner?.full_name || "Counterparty"}
                  </span>
                  <span className="shrink-0 text-[10px] text-[#718078]">
                    {formatRelativeTime(conv.last_message_at)}
                  </span>
                </div>
                <p className="truncate text-[11px] font-medium text-[#173D32]">
                  {conv.pool?.pool_code}: {conv.pool?.origin_name} →{" "}
                  {conv.pool?.destination_name}
                </p>
                {conv.request && <StatusBadge status={conv.request.status} />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Right Chat & Deal Confirmation Workspace */}
      <section
        className={cn(
          "flex flex-col bg-[#F4F5F1]/40 lg:col-span-8 lg:flex",
          mobileShowThread ? "flex" : "hidden",
        )}
      >
        {selectedConv && (
          <>
            {/* Thread Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E8E2] bg-white px-4 py-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileShowThread(false)}
                  className="rounded-lg border border-[#E4E8E2] p-1.5 text-[#242B31] lg:hidden"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-sm font-bold text-[#173D32]">
                    {selectedConv.owner_id === currentUserId
                      ? selectedConv.requester?.full_name
                      : selectedConv.owner?.full_name}
                  </p>
                  <p className="text-[11px] text-[#718078]">
                    Pool {selectedConv.pool?.pool_code} •{" "}
                    {selectedConv.pool?.origin_name} →{" "}
                    {selectedConv.pool?.destination_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeRequest && <StatusBadge status={activeRequest.status} />}
                <Link
                  href={`/pools/${selectedConv.pool_id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E4E8E2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#173D32] hover:bg-[#F4F5F1]"
                >
                  Open Pool
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {/* Deal Terms & Mutual Confirmation Bar */}
            {activeRequest && (
              <div className="border-b border-[#E4E8E2] bg-white px-4 py-3">
                {!editingTerms ? (
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="space-y-1 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-[#173D32]">
                          Agreed Terms v{activeRequest.terms_version}:
                        </span>
                        <span className="font-semibold text-[#242B31]">
                          {formatWeight(
                            activeRequest.agreed_capacity_kg ??
                              activeRequest.required_capacity_kg,
                          )}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-[#173D32]">
                          {formatCurrency(
                            activeRequest.agreed_price ??
                              activeRequest.proposed_price,
                          )}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#718078]">
                        Pickup:{" "}
                        {activeRequest.agreed_pickup_point ??
                          activeRequest.pickup_location}{" "}
                        → Drop:{" "}
                        {activeRequest.agreed_drop_point ??
                          activeRequest.drop_location}
                        {activeRequest.agreed_departure_time
                          ? ` • Dep: ${activeRequest.agreed_departure_time}`
                          : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span
                          className={
                            activeRequest.owner_confirmed_terms
                              ? "font-semibold text-[#1F6B48]"
                              : "text-[#718078]"
                          }
                        >
                          {activeRequest.owner_confirmed_terms ? "✓" : "○"}{" "}
                          Transporter confirmed
                        </span>
                        <span
                          className={
                            activeRequest.requester_confirmed_terms
                              ? "font-semibold text-[#1F6B48]"
                              : "text-[#718078]"
                          }
                        >
                          {activeRequest.requester_confirmed_terms ? "✓" : "○"}{" "}
                          Shipper confirmed
                        </span>
                      </div>
                    </div>

                    {canNegotiate && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={openTermsEditor}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E8E2] bg-[#F4F5F1] px-3 py-1.5 text-xs font-semibold text-[#242B31] hover:bg-white"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          Propose / Edit Terms
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDeal}
                          disabled={confirmingDeal || userAlreadyConfirmed}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#244638] disabled:opacity-60"
                        >
                          {confirmingDeal ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Handshake className="h-3.5 w-3.5" />
                          )}
                          {userAlreadyConfirmed
                            ? "Confirmed by You"
                            : "Confirm Deal"}
                        </button>
                      </div>
                    )}

                    {activeRequest.status === "CONFIRMED" && (
                      <Link
                        href="/my-deals"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#1F6B48] px-3.5 py-1.5 text-xs font-semibold text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        View Deal in My Deals
                      </Link>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleProposeTerms} className="space-y-3">
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">
                          Quantity (kg)
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={propCapacity}
                          onChange={(e) => setPropCapacity(e.target.value)}
                          className="agri-input py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">
                          Total Contribution (₹)
                        </label>
                        <input
                          type="number"
                          min={0}
                          required
                          value={propPrice}
                          onChange={(e) => setPropPrice(e.target.value)}
                          className="agri-input py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">
                          Departure Time
                        </label>
                        <input
                          type="text"
                          required
                          value={propDeparture}
                          onChange={(e) => setPropDeparture(e.target.value)}
                          className="agri-input py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">
                          Agreed Pickup Point
                        </label>
                        <input
                          type="text"
                          required
                          value={propPickup}
                          onChange={(e) => setPropPickup(e.target.value)}
                          className="agri-input py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-semibold">
                          Agreed Drop Point
                        </label>
                        <input
                          type="text"
                          required
                          value={propDrop}
                          onChange={(e) => setPropDrop(e.target.value)}
                          className="agri-input py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold">
                        Special Cargo Conditions (Optional)
                      </label>
                      <input
                        type="text"
                        value={propConditions}
                        onChange={(e) => setPropConditions(e.target.value)}
                        placeholder="e.g. Loaded on tarpaulin-covered pallets"
                        className="agri-input py-1.5 text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingTerms(false)}
                        className="rounded-lg border border-[#E4E8E2] px-3 py-1.5 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingTerms}
                        className="rounded-lg bg-[#173D32] px-3.5 py-1.5 text-xs font-semibold text-white"
                      >
                        {savingTerms ? "Sending..." : "Send Proposal"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Message History */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 max-h-[400px]">
              {loadingMessages ? (
                <div className="flex h-full items-center justify-center text-xs text-[#718078]">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <p className="text-center text-xs text-[#718078]">
                  No messages yet. Introduce your cargo and confirm pickup
                  timing.
                </p>
              ) : (
                messages.map((msg) => {
                  if (msg.message_type === "system") {
                    return (
                      <div
                        key={msg.id}
                        className="mx-auto max-w-lg rounded-lg border border-[#E4E8E2] bg-white px-3.5 py-2 text-center text-[11px] text-[#718078]"
                      >
                        {msg.body}
                      </div>
                    );
                  }

                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex flex-col",
                        isMine ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
                          msg.message_type === "proposal"
                            ? "border border-[#D5A45B] bg-[#D5A45B]/15 text-[#242B31]"
                            : isMine
                              ? "bg-[#173D32] text-white"
                              : "border border-[#E4E8E2] bg-white text-[#242B31]",
                        )}
                      >
                        {msg.message_type === "proposal" && (
                          <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#8A611E]">
                            Deal Terms Proposal
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{msg.body}</p>
                      </div>
                      <span className="mt-1 text-[10px] text-[#718078]">
                        {formatRelativeTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSendMessage}
              className="flex items-center gap-2 border-t border-[#E4E8E2] bg-white p-3"
            >
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Write a message about pickup, loading, or price..."
                className="agri-input flex-1"
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageInput.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#173D32] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#244638] disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

