"use client";

import { ArrowUp, ArrowDown } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number | null;
  format?: "number" | "currency" | "percent";
  isLoading?: boolean;
}

function formatValue(value: string | number, format?: string): string {
  if (typeof value === "string") return value;
  if (format === "currency") return "$" + value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (format === "percent") return value.toFixed(1) + "%";
  return value.toLocaleString("en-US");
}

export function KpiCard({ label, value, delta, format, isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-card border border-border p-4 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-3" />
        <div className="h-7 w-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card border border-border p-4">
      <p className="text-xs text-muted-foreground mb-1 truncate">{label}</p>
      <p className="text-xl font-bold text-foreground">{formatValue(value, format)}</p>
      {delta != null && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${delta >= 0 ? "text-green-600" : "text-red-600"}`}>
          {delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
          <span>{Math.abs(delta).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}
