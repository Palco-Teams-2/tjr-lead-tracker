"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  User,
  Mail,
  Phone,
  Globe,
  Tag,
  DollarSign,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Link2,
  TrendingUp,
  Activity,
  ShoppingCart,
  PhoneCall,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/normalize";
import type { JourneyResult, SearchSuggestion } from "@/lib/types";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  lead_created: <User className="w-4 h-4" />,
  optin: <Mail className="w-4 h-4" />,
  sale: <ShoppingCart className="w-4 h-4" />,
  call_booked: <PhoneCall className="w-4 h-4" />,
  call_cancelled: <PhoneCall className="w-4 h-4" />,
  membership: <Tag className="w-4 h-4" />,
};

const EVENT_COLORS: Record<string, string> = {
  lead_created: "border-zinc-500 bg-zinc-500/10",
  optin: "border-blue-500 bg-blue-500/10",
  sale: "border-emerald-500 bg-emerald-500/10",
  call_booked: "border-amber-500 bg-amber-500/10",
  call_cancelled: "border-red-500 bg-red-500/10",
  membership: "border-violet-500 bg-violet-500/10",
};

const SOURCE_BADGE: Record<string, string> = {
  hyros: "bg-orange-500/20 text-orange-300",
  crm: "bg-blue-500/20 text-blue-300",
  whop: "bg-pink-500/20 text-pink-300",
  calendly: "bg-teal-500/20 text-teal-300",
  lto: "bg-cyan-500/20 text-cyan-300",
  triage: "bg-yellow-500/20 text-yellow-300",
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default function LeadTrackerPage() {
  const [query, setQuery] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchJourney = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const params = new URLSearchParams({ q });
      if (secret) params.set("secret", secret);
      const res = await fetch(`/api/journey?${params}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Search failed");
        setJourney(null);
      } else {
        setJourney(data);
      }
    } catch {
      setError("Network error");
      setJourney(null);
    } finally {
      setLoading(false);
    }
  }, [secret]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.ok) setSuggestions(data.suggestions ?? []);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchJourney(query);
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white leading-tight">TJR Lead Tracker</h1>
              <p className="text-xs text-zinc-500">Hyros · Dregs · Fingerprint · tjr_mm6</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex gap-2" ref={searchRef}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search by email, phone, or name…"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 text-sm"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl z-50 overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s.email}
                      type="button"
                      onClick={() => {
                        setQuery(s.email);
                        fetchJourney(s.email);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-zinc-800 flex items-center gap-3 text-sm transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white truncate">{s.email}</div>
                        {s.name && <div className="text-zinc-500 text-xs truncate">{s.name}</div>}
                      </div>
                      {s.eventCount != null && s.eventCount > 0 && (
                        <span className="ml-auto text-xs text-emerald-400 shrink-0">{s.eventCount} sales</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="API secret"
              className="w-32 sm:w-40 px-3 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Track
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Empty state */}
        {!journey && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-zinc-600" />
            </div>
            <h2 className="text-xl font-medium text-zinc-300 mb-2">Search a lead to build their journey</h2>
            <p className="text-zinc-500 text-sm max-w-md">
              Cross-identifies users from tjr_mm6 — Hyros opt-ins, sales, calls, CRM records, Whop memberships, and shared IP/device signals.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 mb-6 animate-fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {/* Results */}
        {journey && !loading && (
          <div className="space-y-6 animate-fade-in">
            {/* Profile + Stats row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Profile card */}
              <div className="lg:col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-lg font-bold text-white">
                      {(journey.profile?.name ?? journey.profile?.email ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">{journey.profile?.name ?? "Unknown"}</h2>
                      <p className="text-sm text-zinc-400">{journey.profile?.email}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border font-medium",
                      STAGE_COLORS[journey.summary.lifecycleStage] ?? STAGE_COLORS.visitor
                    )}
                  >
                    {STAGE_LABELS[journey.summary.lifecycleStage] ?? journey.summary.lifecycleStage}
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  {journey.profile?.phone && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Phone className="w-3.5 h-3.5" />
                      {journey.profile.phone}
                    </div>
                  )}
                  {journey.profile?.country && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Globe className="w-3.5 h-3.5" />
                      {journey.profile.country}
                    </div>
                  )}
                  {journey.profile?.utmSource && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Tag className="w-3.5 h-3.5" />
                      UTM: {journey.profile.utmSource}
                    </div>
                  )}
                  {journey.profile?.createdAt && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Calendar className="w-3.5 h-3.5" />
                      First seen {formatDate(journey.profile.createdAt)}
                    </div>
                  )}
                  {journey.profile?.dubId && (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Link2 className="w-3.5 h-3.5" />
                      Dub: <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{journey.profile.dubId}</code>
                    </div>
                  )}
                </div>

                {journey.summary.attributionSources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Attribution sources</p>
                    <div className="flex flex-wrap gap-1.5">
                      {journey.summary.attributionSources.map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/20">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats grid */}
              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Events" value={journey.summary.totalEvents} icon={<Activity className="w-3.5 h-3.5" />} />
                <StatCard label="Hyros Sales" value={journey.summary.hyrosSales} icon={<ShoppingCart className="w-3.5 h-3.5" />} />
                <StatCard label="Revenue" value={formatCurrency(journey.summary.totalRevenue)} icon={<DollarSign className="w-3.5 h-3.5" />} />
                <StatCard label="Linked Emails" value={journey.summary.linkedEmails} icon={<Link2 className="w-3.5 h-3.5" />} />
                <StatCard label="Opt-ins" value={journey.summary.hyrosOptins} icon={<Mail className="w-3.5 h-3.5" />} />
                <StatCard label="Calls" value={journey.summary.hyrosCalls + journey.summary.bookedCalls} icon={<PhoneCall className="w-3.5 h-3.5" />} />
                <StatCard label="CRM Sales" value={journey.summary.crmSales} icon={<DollarSign className="w-3.5 h-3.5" />} />
                <StatCard label="Whop" value={journey.summary.whopMemberships} icon={<Tag className="w-3.5 h-3.5" />} />
              </div>
            </div>

            {/* Linked identities */}
            {journey.linkedIdentities.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <h3 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Cross-identified emails ({journey.linkedIdentities.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {journey.linkedIdentities.map((i) => (
                    <button
                      key={i.email}
                      onClick={() => {
                        setQuery(i.email);
                        fetchJourney(i.email);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-white transition-colors"
                    >
                      {i.email}
                      <span className="text-zinc-500 ml-1.5">· {i.linkReason}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-medium text-white">User Journey</h3>
                <span className="text-xs text-zinc-500">Match: {journey.matchType} · {journey.events.length} events</span>
              </div>

              <div className="divide-y divide-zinc-800/50 max-h-[600px] overflow-y-auto">
                {journey.events.map((event) => (
                  <div key={event.id} className="px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg border flex items-center justify-center shrink-0",
                          EVENT_COLORS[event.type] ?? "border-zinc-600 bg-zinc-800"
                        )}
                      >
                        {EVENT_ICONS[event.type] ?? <Activity className="w-4 h-4" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-white text-sm">{event.title}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium uppercase", SOURCE_BADGE[event.sourceSystem] ?? "bg-zinc-700 text-zinc-300")}>
                            {event.sourceSystem}
                          </span>
                          {event.value != null && event.value > 0 && (
                            <span className="text-xs text-emerald-400 font-medium">{formatCurrency(event.value, event.currency ?? "USD")}</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{formatDate(event.occurredAt)}</p>

                        {event.meta && Object.keys(event.meta).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(event.meta)
                              .filter(([, v]) => v != null && v !== "")
                              .slice(0, 5)
                              .map(([k, v]) => (
                                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                                  {k}: {Array.isArray(v) ? v.slice(0, 3).join(", ") : String(v)}
                                </span>
                              ))}
                          </div>
                        )}
                      </div>

                      {event.payload != null && (
                        <button
                          onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
                        >
                          <ChevronRight className={cn("w-4 h-4 transition-transform", expandedEvent === event.id && "rotate-90")} />
                        </button>
                      )}
                    </div>

                    {expandedEvent === event.id && event.payload != null && (
                      <pre className="mt-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 overflow-x-auto max-h-64">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 mt-12 py-4 text-center text-xs text-zinc-600">
        Source of truth: tjr_mm6 · Palco Labs
      </footer>
    </div>
  );
}
