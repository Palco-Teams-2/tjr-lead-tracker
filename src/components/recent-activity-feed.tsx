"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Loader2 } from "lucide-react";
import { activityActionLabel } from "@/lib/activity-labels";
import type { RecentActivityItem } from "@/lib/types";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const POLL_MS = 10_000;

const SOURCE_COLORS: Record<string, string> = {
  hyros: "bg-orange-500/10 text-orange-700 border-orange-200",
  crm: "bg-blue-500/10 text-blue-700 border-blue-200",
  whop: "bg-violet-500/10 text-violet-700 border-violet-200",
  triage: "bg-amber-500/10 text-amber-700 border-amber-200",
};

const ACTION_COLORS: Record<string, string> = {
  sale: "text-green-700",
  optin: "text-blue-700",
  call: "text-teal-700",
  membership: "text-violet-700",
  triage: "text-amber-700",
  lead: "text-muted-foreground",
};

type RecentActivityFeedProps = {
  onSelectLead: (email: string) => void;
  activeEmail?: string | null;
  className?: string;
};

export function RecentActivityFeed({ onSelectLead, activeEmail, className }: RecentActivityFeedProps) {
  const [items, setItems] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchFeed = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch("/api/recent-activity?limit=40");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to load activity");
        return;
      }
      setError(null);
      setItems(data.items ?? []);
      setLastUpdated(data.fetchedAt ?? new Date().toISOString());
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(true);
    const id = setInterval(() => fetchFeed(false), POLL_MS);
    return () => clearInterval(id);
  }, [fetchFeed]);

  return (
    <div className={cn("flex flex-col rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-[var(--chart-1)]" />
          <h2 className="text-sm font-semibold text-foreground">Live activity</h2>
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-green-500" />
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">Updated {formatRelativeTime(lastUpdated)}</span>
        )}
      </div>

      <div className="max-h-[calc(100svh-12rem)] overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="px-4 py-8 text-center text-sm text-destructive">{error}</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No recent activity</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectLead(item.email)}
                  className={cn(
                    "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-blue-50/80",
                    activeEmail?.toLowerCase() === item.email.toLowerCase() && "bg-blue-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {item.name ?? item.email}
                      </p>
                      {item.name && (
                        <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelativeTime(item.occurredAt)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cn("text-xs font-medium", ACTION_COLORS[item.actionType])}>
                      {activityActionLabel(item.actionType)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px] font-medium uppercase",
                        SOURCE_COLORS[item.sourceSystem] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {item.sourceSystem}
                    </Badge>
                    {item.value != null && item.value > 0 && (
                      <span className="text-xs font-semibold text-green-700">
                        {formatCurrency(item.value)}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
