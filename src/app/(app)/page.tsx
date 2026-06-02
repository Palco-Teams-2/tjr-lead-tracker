"use client";

import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import {
  Search,
  Mail,
  Phone,
  Globe,
  Tag,
  Calendar,
  ChevronRight,
  Loader2,
  AlertCircle,
  Link2,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/normalize";
import type { JourneyResult, SearchSuggestion } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { StatsCard10 } from "@/components/stats-card10";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SOURCE_COLORS: Record<string, string> = {
  hyros: "bg-orange-500/10 text-orange-700 border-orange-200",
  crm: "bg-blue-500/10 text-blue-700 border-blue-200",
  whop: "bg-violet-500/10 text-violet-700 border-violet-200",
  calendly: "bg-teal-500/10 text-teal-700 border-teal-200",
  lto: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
  triage: "bg-amber-500/10 text-amber-700 border-amber-200",
};

function JourneyTable({
  events,
  expandedEvent,
  setExpandedEvent,
}: {
  events: JourneyResult["events"];
  expandedEvent: string | null;
  setExpandedEvent: (id: string | null) => void;
}) {
  const maxValue = Math.max(...events.map((e) => e.value ?? 0), 1);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Event Timeline</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-4 text-left font-medium">Date</th>
              <th className="py-2 px-4 text-left font-medium">Event</th>
              <th className="py-2 px-4 text-left font-medium">Source</th>
              <th className="py-2 pl-4 text-right font-medium">Value</th>
              <th className="w-32 py-2 pl-4" />
              <th className="w-10 py-2" />
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => (
              <Fragment key={event.id}>
                <tr className="border-b border-border/50 transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-muted-foreground">
                    {formatDate(event.occurredAt)}
                  </td>
                  <td className="py-2 px-4 font-medium text-foreground">
                    <span className="mr-2 text-xs text-muted-foreground">{i + 1}.</span>
                    {event.title}
                  </td>
                  <td className="py-2 px-4">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase",
                        SOURCE_COLORS[event.sourceSystem] ?? "bg-muted text-muted-foreground border-border"
                      )}
                    >
                      {event.sourceSystem}
                    </span>
                  </td>
                  <td className="py-2 pl-4 text-right font-semibold text-foreground">
                    {event.value != null && event.value > 0
                      ? formatCurrency(event.value, event.currency ?? "USD")
                      : "—"}
                  </td>
                  <td className="py-2 pl-4">
                    {event.value != null && event.value > 0 && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-[var(--chart-1)] opacity-80"
                          style={{ width: `${((event.value ?? 0) / maxValue) * 100}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2">
                    {event.payload != null && (
                      <button
                        type="button"
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-blue-50 hover:text-[var(--chart-1)]"
                      >
                        <ChevronRight
                          className={cn("size-4 transition-transform", expandedEvent === event.id && "rotate-90")}
                        />
                      </button>
                    )}
                  </td>
                </tr>
                {expandedEvent === event.id && event.payload != null && (
                  <tr className="border-b border-border/50 bg-muted/20">
                    <td colSpan={6} className="p-4">
                      <pre className="max-h-48 overflow-auto rounded-md border border-border bg-background p-3 text-[10px] text-muted-foreground">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LeadTrackerDashboard() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journey, setJourney] = useState<JourneyResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const fetchJourney = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setShowSuggestions(false);
    try {
      const res = await fetch(`/api/journey?${new URLSearchParams({ q })}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Search failed");
        setJourney(null);
      } else {
        setJourney(data);
        setActiveTab("overview");
      }
    } catch {
      setError("Network error");
      setJourney(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <main className="-m-6 pt-10">
      {/* Filter bar — identical structure to admin dashboard */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 via-blue-400 to-indigo-500">
                <span className="text-xs font-bold text-white">T</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">TJR Trades</span>
                  <span className="inline-flex items-center rounded-md bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none text-white">
                    Admin
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Lead Tracker</p>
              </div>
            </div>
          </div>
        </div>

        <div ref={searchRef} className="flex flex-1 items-center justify-end gap-2">
          {journey && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchJourney(query)}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            </Button>
          )}
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => e.key === "Enter" && fetchJourney(query)}
              placeholder="Search by email, phone, or name…"
              className="h-8 pl-9 text-xs"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-lg">
                {suggestions.map((s) => (
                  <button
                    key={s.email}
                    type="button"
                    onClick={() => {
                      setQuery(s.email);
                      fetchJourney(s.email);
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-blue-50 hover:text-[var(--chart-1)]"
                  >
                    <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{s.email}</div>
                      {s.name && <div className="truncate text-xs text-muted-foreground">{s.name}</div>}
                    </div>
                    {s.eventCount != null && s.eventCount > 0 && (
                      <span className="shrink-0 text-xs text-green-600">{s.eventCount} sales</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="sm" className="h-8" onClick={() => fetchJourney(query)} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Search className="size-3.5" />}
            Track
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4">
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!journey && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6 flex size-16 items-center justify-center rounded-xl border border-border bg-muted">
              <TrendingUp className="size-8 text-muted-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Search a lead to build their journey</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Cross-identifies users from tjr_mm6 — Hyros, CRM, Whop, and shared IP signals.
            </p>
          </div>
        )}

        {loading && !journey && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {journey && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="journey">User Journey</TabsTrigger>
              <TabsTrigger value="identities">Linked Identities</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <StatsCard10
                    title="Total Revenue"
                    value={formatCurrency(journey.summary.totalRevenue)}
                    change={0}
                    period={`${journey.summary.hyrosSales} Hyros sales`}
                  />
                  <StatsCard10
                    title="Lifecycle Stage"
                    value={STAGE_LABELS[journey.summary.lifecycleStage] ?? journey.summary.lifecycleStage}
                    change={0}
                    period={journey.profile?.email ?? journey.query}
                    className="border-l-[var(--chart-1)]"
                  />
                  <StatsCard10
                    title="Total Events"
                    value={String(journey.summary.totalEvents)}
                    change={0}
                    period={`Match: ${journey.matchType}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                  <KpiCard label="Events" value={journey.summary.totalEvents} isLoading={loading} />
                  <KpiCard label="Hyros Sales" value={journey.summary.hyrosSales} isLoading={loading} />
                  <KpiCard label="Revenue" value={formatCurrency(journey.summary.totalRevenue)} isLoading={loading} />
                  <KpiCard label="Linked Emails" value={journey.summary.linkedEmails} isLoading={loading} />
                  <KpiCard label="Opt-ins" value={journey.summary.hyrosOptins} isLoading={loading} />
                  <KpiCard label="Calls" value={journey.summary.hyrosCalls + journey.summary.bookedCalls} isLoading={loading} />
                  <KpiCard label="CRM Sales" value={journey.summary.crmSales} isLoading={loading} />
                  <KpiCard label="Whop" value={journey.summary.whopMemberships} isLoading={loading} />
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="mb-4 text-sm font-medium text-muted-foreground">Lead Profile</h3>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-400 via-orange-400 to-amber-400">
                        <span className="text-sm font-bold text-white">
                          {(journey.profile?.name ?? journey.profile?.email ?? "?")[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{journey.profile?.name ?? "Unknown"}</p>
                        <p className="text-sm text-muted-foreground">{journey.profile?.email}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("ml-2 border", STAGE_COLORS[journey.summary.lifecycleStage] ?? STAGE_COLORS.visitor)}
                      >
                        {STAGE_LABELS[journey.summary.lifecycleStage]}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                      {journey.profile?.phone && (
                        <div className="flex items-center gap-2"><Phone className="size-3.5" />{journey.profile.phone}</div>
                      )}
                      {journey.profile?.country && (
                        <div className="flex items-center gap-2"><Globe className="size-3.5" />{journey.profile.country}</div>
                      )}
                      {journey.profile?.utmSource && (
                        <div className="flex items-center gap-2"><Tag className="size-3.5" />UTM: {journey.profile.utmSource}</div>
                      )}
                      {journey.profile?.createdAt && (
                        <div className="flex items-center gap-2"><Calendar className="size-3.5" />First seen {formatDate(journey.profile.createdAt)}</div>
                      )}
                      {journey.profile?.dubId && (
                        <div className="flex items-center gap-2">
                          <Link2 className="size-3.5" />
                          Dub: <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{journey.profile.dubId}</code>
                        </div>
                      )}
                    </div>
                  </div>
                  {journey.summary.attributionSources.length > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="flex flex-wrap gap-1.5">
                        {journey.summary.attributionSources.map((s) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="journey">
              <div className="space-y-4 pt-4">
                <JourneyTable
                  events={journey.events}
                  expandedEvent={expandedEvent}
                  setExpandedEvent={setExpandedEvent}
                />
              </div>
            </TabsContent>

            <TabsContent value="identities">
              <div className="pt-4">
                {journey.linkedIdentities.length === 0 ? (
                  <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
                    No cross-identified emails found for this lead.
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">Cross-identified Emails</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground">
                            <th className="py-2 pr-4 text-left font-medium">Email</th>
                            <th className="py-2 px-4 text-left font-medium">Link Reason</th>
                            <th className="py-2 pl-4 text-right font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {journey.linkedIdentities.map((i, idx) => (
                            <tr key={i.email} className="border-b border-border/50 transition-colors hover:bg-muted/30">
                              <td className="py-2 pr-4 font-medium">
                                <span className="mr-2 text-xs text-muted-foreground">{idx + 1}.</span>
                                {i.email}
                              </td>
                              <td className="py-2 px-4 text-muted-foreground">{i.linkReason}</td>
                              <td className="py-2 pl-4 text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs hover:border-[var(--chart-1)] hover:bg-blue-50 hover:text-[var(--chart-1)]"
                                  onClick={() => {
                                    setQuery(i.email);
                                    fetchJourney(i.email);
                                  }}
                                >
                                  View
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
