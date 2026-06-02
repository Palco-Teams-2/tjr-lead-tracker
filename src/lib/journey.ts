import { resolveDregsLinks } from "./dregs";
import { getPool } from "./db";
import {
  extractDubId,
  extractHyrosLeadId,
  inferLifecycleStage,
  isEmail,
  isPhone,
  normalizeEmail,
  normalizePhone,
} from "./normalize";
import type {
  JourneyEvent,
  JourneyResult,
  LeadProfile,
  LinkedIdentity,
  SearchSuggestion,
} from "./types";

function pushEvent(events: JourneyEvent[], event: JourneyEvent) {
  if (!events.some((e) => e.id === event.id)) events.push(event);
}

function parseAttributionSource(attribution: unknown): string | null {
  if (!attribution || typeof attribution !== "object") return null;
  const a = attribution as Record<string, unknown>;
  const arr = (a.attribution ?? a) as unknown[];
  if (!Array.isArray(arr) || !arr[0]) return null;
  const first = arr[0] as Record<string, unknown>;
  const tag = first.tag as string | undefined;
  const name = first.name as string | undefined;
  const ts = first.trafficSource as Record<string, string> | undefined;
  return tag ?? name ?? ts?.name ?? null;
}

export async function searchSuggestions(q: string, limit = 8): Promise<SearchSuggestion[]> {
  const pool = getPool();
  const term = q.trim();
  if (term.length < 2) return [];

  const { rows } = await pool.query(
    `SELECT l.email, l.name, l.phone,
            (SELECT COUNT(*)::int FROM fct_hyros_attributed_sales s WHERE s.lead_email ILIKE l.email) AS sales
     FROM leads l
     WHERE l.email ILIKE $1 OR l.name ILIKE $1 OR l.phone ILIKE $1
     ORDER BY sales DESC NULLS LAST, l.created_at DESC
     LIMIT $2`,
    [`%${term}%`, limit]
  );

  return rows.map((r) => ({
    email: r.email,
    name: r.name,
    phone: r.phone,
    eventCount: r.sales,
  }));
}

export async function buildJourney(query: string): Promise<JourneyResult | null> {
  const pool = getPool();
  const q = query.trim();
  if (!q) return null;

  const emails = new Set<string>();
  const phones = new Set<string>();
  const crmLeadIds = new Set<string>();
  const dubIds = new Set<string>();
  let matchType = "unknown";
  let primaryEmail: string | null = null;

  if (isEmail(q)) {
    primaryEmail = q.toLowerCase();
    emails.add(primaryEmail);
    emails.add(normalizeEmail(primaryEmail));
    matchType = "email";
  } else if (isPhone(q)) {
    phones.add(normalizePhone(q));
    matchType = "phone";
  } else if (q.includes("@")) {
    primaryEmail = q.toLowerCase();
    emails.add(primaryEmail);
    matchType = "email_partial";
  } else {
    // name or partial search — resolve to email first
    const { rows } = await pool.query(
      `SELECT email FROM leads WHERE email ILIKE $1 OR name ILIKE $1 LIMIT 1`,
      [q.includes("%") ? q : `%${q}%`]
    );
    if (rows[0]?.email) {
      const resolved = rows[0].email.toLowerCase();
      primaryEmail = resolved;
      emails.add(resolved);
      matchType = "name";
    }
  }

  // Resolve phone → emails
  if (phones.size > 0) {
    const phoneList = [...phones];
    const { rows } = await pool.query(
      `SELECT email, phone FROM leads
       WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ANY($1::text[])
       LIMIT 20`,
      [phoneList]
    );
    for (const r of rows) {
      emails.add(r.email.toLowerCase());
      if (!primaryEmail) primaryEmail = r.email.toLowerCase();
    }
  }

  if (emails.size === 0 && matchType === "phone") {
    // Try hyros by phone
    const phoneList = [...phones];
    const { rows } = await pool.query(
      `SELECT DISTINCT lead_email FROM hyros_lead_opt_ins
       WHERE EXISTS (
         SELECT 1 FROM unnest(lead_phone_numbers) p
         WHERE RIGHT(REGEXP_REPLACE(p, '[^0-9]', '', 'g'), 10) = ANY($1::text[])
       )
       LIMIT 10`,
      [phoneList]
    );
    for (const r of rows) {
      if (r.lead_email) {
        emails.add(r.lead_email.toLowerCase());
        if (!primaryEmail) primaryEmail = r.lead_email.toLowerCase();
      }
    }
  }

  if (emails.size === 0) return null;

  const emailList = [...emails];
  const events: JourneyEvent[] = [];
  const linkedIdentities: LinkedIdentity[] = [];
  let profile: LeadProfile | null = null;

  // --- Leads table (source of truth profile) ---
  const leadRes = await pool.query(
    `SELECT * FROM leads WHERE LOWER(email) = ANY($1::text[]) ORDER BY created_at ASC LIMIT 1`,
    [emailList]
  );

  if (leadRes.rows[0]) {
    const l = leadRes.rows[0];
    profile = {
      email: l.email,
      name: l.name,
      phone: l.phone,
      country: l.country,
      utmSource: l.utm_source,
      crmLeadId: l.crm_lead_id,
      disposition: l.disposition,
      createdAt: l.created_at?.toISOString?.() ?? l.created_at,
      dubId: extractDubId(l.payload),
      hyrosLeadId: extractHyrosLeadId(l.payload),
    };
    if (l.crm_lead_id) crmLeadIds.add(l.crm_lead_id);
    if (profile.dubId) dubIds.add(profile.dubId);

    pushEvent(events, {
      id: `lead:${l.email}`,
      type: "lead_created",
      title: "Lead record created",
      source: "server",
      sourceSystem: "crm",
      occurredAt: profile.createdAt ?? new Date().toISOString(),
      meta: { utm_source: l.utm_source, disposition: l.disposition },
      payload: l.payload,
    });
  }

  // All leads matching normalized emails (multi-email detection)
  const allLeads = await pool.query(
    `SELECT email, name, phone, crm_lead_id FROM leads WHERE LOWER(email) = ANY($1::text[])`,
    [emailList]
  );
  for (const l of allLeads.rows) {
    if (l.email !== profile?.email) {
      linkedIdentities.push({
        email: l.email,
        name: l.name,
        phone: l.phone,
        linkReason: "email_match",
        crmLeadId: l.crm_lead_id,
      });
    }
    if (l.crm_lead_id) crmLeadIds.add(l.crm_lead_id);
  }

  // Dregs device graph — shared devices, not Hyros IPs
  const dregs = await resolveDregsLinks(emailList);
  if (dregs.profile && profile) {
    profile.dregs = dregs.profile;
  } else if (dregs.profile && !profile && emailList[0]) {
    profile = { email: emailList[0], dregs: dregs.profile };
  }
  for (const link of dregs.linked) {
    linkedIdentities.push({
      email: link.email,
      name: link.name,
      linkReason: link.linkReason,
    });
  }

  // --- Hyros opt-ins ---
  const optins = await pool.query(
    `SELECT id, lead_email, lead_first_name, lead_last_name, lead_ips, lead_tags, payload, created_at, event_type
     FROM hyros_lead_opt_ins WHERE LOWER(lead_email) = ANY($1::text[])
     ORDER BY created_at ASC`,
    [emailList]
  );
  for (const o of optins.rows) {
    pushEvent(events, {
      id: `hyros_optin:${o.id}`,
      type: "optin",
      title: `Hyros opt-in${o.lead_first_name ? `: ${o.lead_first_name} ${o.lead_last_name ?? ""}`.trim() : ""}`,
      source: "webhook",
      sourceSystem: "hyros",
      occurredAt: o.created_at?.toISOString?.() ?? o.created_at,
      attribution: o.payload?.body?.attribution ?? o.payload?.body?.lastSource ?? null,
      payload: o.payload,
      meta: { tags: o.lead_tags, ips: o.lead_ips },
    });
  }

  // --- Hyros attributed sales ---
  const hyrosSales = await pool.query(
    `SELECT id, lead_email, product_name, product_price, order_id, attribution, sources,
            lead_ips, lead_tags, full_payload, created_at, platform, campaign, adset, is_organic
     FROM fct_hyros_attributed_sales WHERE LOWER(lead_email) = ANY($1::text[])
     ORDER BY created_at ASC`,
    [emailList]
  );
  for (const s of hyrosSales.rows) {
    const price = parseFloat(s.product_price ?? "0");
    pushEvent(events, {
      id: `hyros_sale:${s.id}`,
      type: "sale",
      title: `Sale: ${s.product_name ?? "Unknown product"}`,
      source: "webhook",
      sourceSystem: "hyros",
      occurredAt: s.created_at?.toISOString?.() ?? s.created_at,
      value: price,
      currency: "USD",
      attribution: s.attribution ?? s.sources,
      payload: s.full_payload,
      meta: {
        order_id: s.order_id,
        platform: s.platform,
        campaign: s.campaign,
        adset: s.adset,
        is_organic: s.is_organic,
        tags: s.lead_tags,
      },
    });
  }

  // --- Hyros attributed calls ---
  const hyrosCalls = await pool.query(
    `SELECT id, lead_email, lead_first_name, lead_last_name, lead_ips, lead_tags, payload, created_at, event_type
     FROM hyros_attributed_calls WHERE LOWER(lead_email) = ANY($1::text[])
     ORDER BY created_at ASC`,
    [emailList]
  );
  for (const c of hyrosCalls.rows) {
    pushEvent(events, {
      id: `hyros_call:${c.id}`,
      type: "call_booked",
      title: `Hyros call: ${c.event_type ?? "attributed call"}`,
      source: "webhook",
      sourceSystem: "hyros",
      occurredAt: c.created_at?.toISOString?.() ?? c.created_at,
      payload: c.payload,
      meta: { tags: c.lead_tags, ips: c.lead_ips },
    });
  }

  // --- CRM booked calls ---
  if (crmLeadIds.size > 0) {
    const booked = await pool.query(
      `SELECT bc.event_id, bc.event_name, bc.event_date, bc.created_at, bc.is_cancelled, bc.rescheduled
       FROM booked_calls bc WHERE bc.lead_id = ANY($1::text[]) ORDER BY bc.event_date ASC`,
      [[...crmLeadIds]]
    );
    for (const b of booked.rows) {
      pushEvent(events, {
        id: `booked_call:${b.event_id}`,
        type: b.is_cancelled ? "call_cancelled" : "call_booked",
        title: b.is_cancelled ? `Call cancelled: ${b.event_name}` : `Call booked: ${b.event_name}`,
        source: "server",
        sourceSystem: "calendly",
        occurredAt: (b.event_date ?? b.created_at)?.toISOString?.() ?? b.created_at,
        meta: { rescheduled: b.rescheduled, cancelled: b.is_cancelled },
      });
    }
  }

  // --- CRM sales ---
  if (crmLeadIds.size > 0) {
    const sales = await pool.query(
      `SELECT id, prod_name, total, paid_at, sale_type, status, created_at
       FROM sales WHERE lead_id = ANY($1::text[]) ORDER BY paid_at ASC NULLS LAST`,
      [[...crmLeadIds]]
    );
    for (const s of sales.rows) {
      pushEvent(events, {
        id: `crm_sale:${s.id}`,
        type: "sale",
        title: `CRM sale: ${s.prod_name ?? "Unknown"}`,
        source: "server",
        sourceSystem: "crm",
        occurredAt: (s.paid_at ?? s.created_at)?.toISOString?.() ?? s.created_at,
        value: parseFloat(s.total ?? "0"),
        currency: "USD",
        meta: { sale_type: s.sale_type, status: s.status },
      });
    }
  }

  // --- Whop memberships ---
  const whop = await pool.query(
    `SELECT id, email, product_title, status, whop_created_at, created_at, plan_id
     FROM whop_memberships WHERE LOWER(email) = ANY($1::text[]) ORDER BY created_at ASC`,
    [emailList]
  );
  for (const w of whop.rows) {
    pushEvent(events, {
      id: `whop:${w.id}`,
      type: "membership",
      title: `Whop: ${w.product_title ?? w.plan_id} (${w.status})`,
      source: "webhook",
      sourceSystem: "whop",
      occurredAt: (w.whop_created_at ?? w.created_at)?.toISOString?.() ?? w.created_at,
      meta: { status: w.status },
    });
  }

  // --- LTO optins ---
  if (crmLeadIds.size > 0) {
    const lto = await pool.query(
      `SELECT id, form_name, created_at FROM lto_optins WHERE lead_id = ANY($1::text[]) ORDER BY created_at ASC`,
      [[...crmLeadIds]]
    );
    for (const l of lto.rows) {
      pushEvent(events, {
        id: `lto_optin:${l.id}`,
        type: "optin",
        title: `LTO opt-in: ${l.form_name}`,
        source: "server",
        sourceSystem: "lto",
        occurredAt: l.created_at?.toISOString?.() ?? l.created_at,
      });
    }
  }

  // --- Triage tickets ---
  const triage = await pool.query(
    `SELECT id, lead_email, lead_name, phone, source, status, start_time, created_at, closer_email
     FROM triage_tickets WHERE LOWER(lead_email) = ANY($1::text[]) ORDER BY created_at ASC`,
    [emailList]
  );
  for (const t of triage.rows) {
    pushEvent(events, {
      id: `triage:${t.id}`,
      type: "call_booked",
      title: `Triage: ${t.source ?? "booking"} (${t.status})`,
      source: "server",
      sourceSystem: "triage",
      occurredAt: (t.start_time ?? t.created_at)?.toISOString?.() ?? t.created_at,
      meta: { closer: t.closer_email, status: t.status },
    });
  }

  // Sort timeline newest first
  events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  const attributionSources = [
    ...new Set(
      events
        .map((e) => parseAttributionSource(e.attribution))
        .filter((s): s is string => !!s && s !== "automatic" && s !== "Automatic")
    ),
  ];

  const totalRevenue = events
    .filter((e) => e.type === "sale" && e.value)
    .reduce((sum, e) => sum + (e.value ?? 0), 0);

  const summary = {
    totalEvents: events.length,
    hyrosOptins: optins.rows.length,
    hyrosSales: hyrosSales.rows.length,
    hyrosCalls: hyrosCalls.rows.length,
    bookedCalls: events.filter((e) => e.type === "call_booked").length,
    crmSales: events.filter((e) => e.sourceSystem === "crm" && e.type === "sale").length,
    whopMemberships: whop.rows.length,
    totalRevenue,
    lifecycleStage: inferLifecycleStage(events),
    linkedEmails: linkedIdentities.length,
    attributionSources,
  };

  if (!profile && emailList[0]) {
    profile = { email: emailList[0] };
  }

  return {
    query: q,
    matchType,
    profile,
    linkedIdentities: dedupeIdentities(linkedIdentities),
    events,
    summary,
  };
}

function dedupeIdentities(list: LinkedIdentity[]): LinkedIdentity[] {
  const seen = new Set<string>();
  return list.filter((i) => {
    if (seen.has(i.email.toLowerCase())) return false;
    seen.add(i.email.toLowerCase());
    return true;
  });
}
