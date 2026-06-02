"use client";

interface KpiCardProps {
  label: string;
  value: string | number;
  isLoading?: boolean;
}

export function KpiCard({ label, value, isLoading }: KpiCardProps) {
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
      <p className="text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
