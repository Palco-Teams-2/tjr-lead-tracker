"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Search,
  User,
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
  Activity,
  ShoppingCart,
  PhoneCall,
  Route,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/normalize";
import type { JourneyResult, SearchSuggestion } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  lead_created: <User className="size-4" />,
  optin: <Mail className="size-4" />,
  sale: <ShoppingCart className="size-4" />,
  call_booked: <PhoneCall className="size-4" />,
  call_cancelled: <PhoneCall className="size-4" />,
  membership: <Tag className="size-4" />,
};

const EVENT_ACCENT: Record<string, string> = {
  lead_created: "border-l-zinc-400",
  optin: "border-l-blue-500",
  sale: "border-l-green-500",
  call_booked: "border-l-amber-500",
  call_cancelled: "border-l-red-500",
  membership: "border-l-violet-500",
};

const SOURCE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  hyros: "default",
  crm: "secondary",
  whop: "outline",
  calendly: "outline",
  lto: "outline",
  triage: "outline",
};

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
    <div className="min-h-screen bg-background">
      {/* Top bar — matches internal-app filter bar pattern */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex aspect-square size-8 items-center justify-center rounded-sm bg-primary">
              <Route className="size-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-foreground leading-tight">Lead Tracker</h1>
              <p className="text-xs text-muted-foreground">Palco Labs · tjr_mm6</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2 sm:flex-row" ref={searchRef}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search by email, phone, or name…"
                className="pl-9"
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
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                    >
                      <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-foreground">{s.email}</div>
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
            <Input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="API secret"
              className="sm:w-40"
            />
            <Button type="submit" disabled={loading || !query.trim()} className="shrink-0">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Track
            </Button>
          </form>
        </div>
      </div>

      {/* Main content shell — matches ApplicationShell2 inset panel */}
      <div className="p-2">
        <div className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-7xl rounded-xl border border-border bg-white p-6 shadow-sm">
          {!journey && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="mb-6 flex size-16 items-center justify-center rounded-xl border border-border bg-muted">
                <TrendingUp className="size-8 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-xl font-semibold text-foreground">Search a lead to build their journey</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Cross-identifies users from tjr_mm6 — Hyros opt-ins, sales, calls, CRM records, Whop memberships, and shared IP signals.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">
              <AlertCircle className="size-5 shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {journey && !loading && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="py-0 lg:col-span-1">
                  <CardHeader className="border-b pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar size="lg">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {(journey.profile?.name ?? journey.profile?.email ?? "?")[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{journey.profile?.name ?? "Unknown"}</CardTitle>
                          <CardDescription>{journey.profile?.email}</CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn("border", STAGE_COLORS[journey.summary.lifecycleStage] ?? STAGE_COLORS.visitor)}
                      >
                        {STAGE_LABELS[journey.summary.lifecycleStage] ?? journey.summary.lifecycleStage}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-4">
                    <div className="space-y-2.5 text-sm text-muted-foreground">
                      {journey.profile?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="size-3.5" />
                          {journey.profile.phone}
                        </div>
                      )}
                      {journey.profile?.country && (
                        <div className="flex items-center gap-2">
                          <Globe className="size-3.5" />
                          {journey.profile.country}
                        </div>
                      )}
                      {journey.profile?.utmSource && (
                        <div className="flex items-center gap-2">
                          <Tag className="size-3.5" />
                          UTM: {journey.profile.utmSource}
                        </div>
                      )}
                      {journey.profile?.createdAt && (
                        <div className="flex items-center gap-2">
                          <Calendar className="size-3.5" />
                          First seen {formatDate(journey.profile.createdAt)}
                        </div>
                      )}
                      {journey.profile?.dubId && (
                        <div className="flex items-center gap-2">
                          <Link2 className="size-3.5" />
                          Dub: <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">{journey.profile.dubId}</code>
                        </div>
                      )}
                    </div>

                    {journey.summary.attributionSources.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Attribution sources
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {journey.summary.attributionSources.map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
                  <KpiCard label="Events" value={journey.summary.totalEvents} />
                  <KpiCard label="Hyros Sales" value={journey.summary.hyrosSales} />
                  <KpiCard label="Revenue" value={formatCurrency(journey.summary.totalRevenue)} />
                  <KpiCard label="Linked Emails" value={journey.summary.linkedEmails} />
                  <KpiCard label="Opt-ins" value={journey.summary.hyrosOptins} />
                  <KpiCard label="Calls" value={journey.summary.hyrosCalls + journey.summary.bookedCalls} />
                  <KpiCard label="CRM Sales" value={journey.summary.crmSales} />
                  <KpiCard label="Whop" value={journey.summary.whopMemberships} />
                </div>
              </div>

              {journey.linkedIdentities.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50 py-0">
                  <CardHeader className="py-4">
                    <CardTitle className="flex items-center gap-2 text-sm text-amber-800">
                      <Link2 className="size-4" />
                      Cross-identified emails ({journey.linkedIdentities.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 pt-0">
                    <div className="flex flex-wrap gap-2">
                      {journey.linkedIdentities.map((i) => (
                        <Button
                          key={i.email}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuery(i.email);
                            fetchJourney(i.email);
                          }}
                          className="h-auto py-1.5 text-xs font-normal"
                        >
                          {i.email}
                          <span className="text-muted-foreground">· {i.linkReason}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="gap-0 py-0">
                <CardHeader className="flex-row items-center justify-between border-b py-4">
                  <div>
                    <CardTitle className="text-base">User Journey</CardTitle>
                    <CardDescription>
                      Match: {journey.matchType} · {journey.events.length} events
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[600px]">
                    <div className="divide-y divide-border">
                      {journey.events.map((event) => (
                        <div key={event.id} className="px-6 py-4 transition-colors hover:bg-accent/50">
                          <div className="flex items-start gap-4">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted",
                                EVENT_ACCENT[event.type] && `border-l-4 ${EVENT_ACCENT[event.type]}`
                              )}
                            >
                              {EVENT_ICONS[event.type] ?? <Activity className="size-4" />}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{event.title}</span>
                                <Badge variant={SOURCE_VARIANT[event.sourceSystem] ?? "outline"} className="text-[10px] uppercase">
                                  {event.sourceSystem}
                                </Badge>
                                {event.value != null && event.value > 0 && (
                                  <span className="text-xs font-medium text-green-600">
                                    {formatCurrency(event.value, event.currency ?? "USD")}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{formatDate(event.occurredAt)}</p>

                              {event.meta && Object.keys(event.meta).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {Object.entries(event.meta)
                                    .filter(([, v]) => v != null && v !== "")
                                    .slice(0, 5)
                                    .map(([k, v]) => (
                                      <Badge key={k} variant="outline" className="text-[10px] font-normal">
                                        {k}: {Array.isArray(v) ? v.slice(0, 3).join(", ") : String(v)}
                                      </Badge>
                                    ))}
                                </div>
                              )}
                            </div>

                            {event.payload != null && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                                className="shrink-0"
                              >
                                <ChevronRight
                                  className={cn("size-4 transition-transform", expandedEvent === event.id && "rotate-90")}
                                />
                              </Button>
                            )}
                          </div>

                          {expandedEvent === event.id && event.payload != null && (
                            <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-border bg-muted p-3 text-[11px] text-muted-foreground">
                              {JSON.stringify(event.payload, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
