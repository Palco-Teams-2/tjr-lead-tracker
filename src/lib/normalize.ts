/** Gmail-style email normalization for cross-matching */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const [local, domain] = trimmed.split("@");
  if (!local || !domain) return trimmed;

  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@gmail.com`;
  }
  return `${local.split("+")[0]}@${domain}`;
}

/** Last 10 digits for phone matching */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

export function isEmail(q: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q.trim());
}

export function isPhone(q: string): boolean {
  const digits = q.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

export function extractDubId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const hidden = (p.form_response as Record<string, unknown>)?.hidden as Record<string, string> | undefined;
  if (hidden?.dub_id) return hidden.dub_id;
  if (typeof p.dub_id === "string") return p.dub_id;
  return null;
}

export function extractHyrosLeadId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const body = p.body as Record<string, unknown> | undefined;
  const lead = body?.lead as Record<string, string> | undefined;
  return lead?.id ?? null;
}

export function inferLifecycleStage(events: { type: string; value?: number | null }[]): string {
  let stage = "visitor";
  for (const e of events) {
    if (["optin", "lead_created", "form_submit"].includes(e.type)) stage = "lead";
    if (e.type === "call_booked") stage = "prospect";
    if (e.type === "sale") {
      const v = e.value ?? 0;
      stage = v >= 999 ? "ht_customer" : "lt_customer";
    }
  }
  return stage;
}

export const STAGE_LABELS: Record<string, string> = {
  visitor: "Visitor",
  lead: "Lead",
  prospect: "Prospect",
  lt_customer: "LT Customer",
  ht_customer: "HT Customer",
};

export const STAGE_COLORS: Record<string, string> = {
  visitor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30",
  lead: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  prospect: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  lt_customer: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  ht_customer: "bg-violet-500/20 text-violet-300 border-violet-500/30",
};
