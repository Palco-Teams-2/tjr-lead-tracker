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
  RefreshCw,
} from "lucide-react";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { STAGE_COLORS, STAGE_LABELS } from "@/lib/normalize";
import type { JourneyResult, SearchSuggestion } from "@/lib/types";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const EVENT_ICONS: Record<string, React.ReactNode> = {
  lead_created: <User className="size-4" />,
  optin: <Mail className="size-4" />,
  sale: <ShoppingCart className="size-4" />,
  call_booked: <PhoneCall className="size-4" />,
  call_cancelled: <PhoneCall className="size-4" />,
  membership: <Tag className="size-4" />,
};

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
      {/* Filter bar — same pattern as admin dashboard */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div ref={searchRef} className="flex flex-1 items-center gap-2">
          <div className="relative min-w-[280px] flex-1 max-w-xl">
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
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <Mail className="size-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{s.email}</div>
                      {s.name && <div className="truncate text-xs text-muted-foreground">{s.name}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button onClick={() => fetchJourney(query)} disabled={loading || !query.trim()}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            Track
          </Button>
          {journey && (
            <Button variant="outline" size="icon" onClick={() => fetchJourney(query)} disabled={loading}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>
          )}
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
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                  <Card className="gap-0 py-0 lg:col-span-1">
                    <CardHeader className="border-b py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="lg">
                            <AvatarFallback className="bg-gradient-to-br from-red-400 via-orange-400 to-amber-400 text-white">
                              {(journey.profile?.name ?? journey.profile?.email ?? "?")[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{journey.profile?.name ?? "Unknown"}</CardTitle>
                            <CardDescription>{journey.profile?.email}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("border", STAGE_COLORS[journey.summary.lifecycleStage] ?? STAGE_COLORS.visitor)}>
                          {STAGE_LABELS[journey.summary.lifecycleStage] ?? journey.summary.lifecycleStage}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 py-4 text-sm text-muted-foreground">
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
                      {journey.summary.attributionSources.length > 0 && (
                        <>
                          <Separator className="my-2" />
                          <div className="flex flex-wrap gap-1.5">
                            {journey.summary.attributionSources.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-3">
                    <KpiCard label="Events" value={journey.summary.totalEvents} isLoading={loading} />
                    <KpiCard label="Hyros Sales" value={journey.summary.hyrosSales} isLoading={loading} />
                    <KpiCard label="Revenue" value={formatCurrency(journey.summary.totalRevenue)} isLoading={loading} />
                    <KpiCard label="Linked Emails" value={journey.summary.linkedEmails} isLoading={loading} />
                    <KpiCard label="Opt-ins" value={journey.summary.hyrosOptins} isLoading={loading} />
                    <KpiCard label="Calls" value={journey.summary.hyrosCalls + journey.summary.bookedCalls} isLoading={loading} />
                    <KpiCard label="CRM Sales" value={journey.summary.crmSales} isLoading={loading} />
                    <KpiCard label="Whop" value={journey.summary.whopMemberships} isLoading={loading} />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="journey">
              <div className="pt-4">
                <Card className="gap-0 py-0">
                  <CardHeader className="border-b py-4">
                    <CardTitle className="text-base">User Journey</CardTitle>
                    <CardDescription>Match: {journey.matchType} · {journey.events.length} events</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">Date</TableHead>
                            <TableHead>Event</TableHead>
                            <TableHead className="w-[100px]">Source</TableHead>
                            <TableHead className="w-[100px] text-right">Value</TableHead>
                            <TableHead className="w-[40px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {journey.events.map((event) => (
                            <TableRow key={event.id} className="group">
                              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(event.occurredAt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="flex size-7 items-center justify-center rounded-md border border-border bg-muted">
                                    {EVENT_ICONS[event.type] ?? <Activity className="size-3.5" />}
                                  </span>
                                  <div>
                                    <div className="text-sm font-medium">{event.title}</div>
                                    {expandedEvent === event.id && event.payload != null && (
                                      <pre className="mt-2 max-h-48 overflow-auto rounded-md border border-border bg-muted p-2 text-[10px] text-muted-foreground">
                                        {JSON.stringify(event.payload, null, 2)}
                                      </pre>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px] uppercase">{event.sourceSystem}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium text-green-600">
                                {event.value != null && event.value > 0 ? formatCurrency(event.value, event.currency ?? "USD") : "—"}
                              </TableCell>
                              <TableCell>
                                {event.payload != null && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                                  >
                                    <ChevronRight className={cn("size-4 transition-transform", expandedEvent === event.id && "rotate-90")} />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="identities">
              <div className="pt-4">
                {journey.linkedIdentities.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-sm text-muted-foreground">
                      No cross-identified emails found for this lead.
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="gap-0 py-0">
                    <CardHeader className="border-b py-4">
                      <CardTitle className="text-base">Cross-identified emails</CardTitle>
                      <CardDescription>{journey.linkedIdentities.length} linked via shared signals</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Link reason</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {journey.linkedIdentities.map((i) => (
                            <TableRow key={i.email}>
                              <TableCell className="font-medium">{i.email}</TableCell>
                              <TableCell className="text-muted-foreground">{i.linkReason}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setQuery(i.email);
                                    fetchJourney(i.email);
                                  }}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
