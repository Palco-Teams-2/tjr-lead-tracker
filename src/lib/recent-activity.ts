import { getPool } from "./db";
import type { RecentActivityItem } from "./types";

const ACTION_LABELS: Record<string, string> = {
  sale: "Sale",
  optin: "Opt-in",
  call: "Call booked",
  membership: "Membership",
  triage: "Triage",
  lead: "New lead",
};

function formatHyrosTitle(raw: string | null, actionType: string): string {
  if (!raw) return ACTION_LABELS[actionType] ?? actionType;
  if (!raw.includes(".")) return raw;
  return raw
    .replace(/^lead\./, "")
    .replace(/\./g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchRecentActivity(limit = 40): Promise<RecentActivityItem[]> {
  const pool = getPool();
  const perSource = Math.min(limit, 25);

  const { rows } = await pool.query(
    `
    WITH recent AS (
      SELECT 'sale' AS action_type,
             'hyros_sale:' || id::text AS event_id,
             lead_email AS email,
             COALESCE(product_name, 'Sale') AS title,
             created_at,
             'hyros' AS source_system,
             product_price::float8 AS value
      FROM fct_hyros_attributed_sales
      ORDER BY created_at DESC
      LIMIT $1

      UNION ALL

      SELECT 'optin',
             'hyros_optin:' || id::text,
             lead_email,
             COALESCE(event_type, 'Opt-in'),
             created_at,
             'hyros',
             NULL
      FROM hyros_lead_opt_ins
      ORDER BY created_at DESC
      LIMIT $1

      UNION ALL

      SELECT 'call',
             'hyros_call:' || id::text,
             lead_email,
             COALESCE(event_type, 'Call'),
             created_at,
             'hyros',
             NULL
      FROM hyros_attributed_calls
      ORDER BY created_at DESC
      LIMIT $1

      UNION ALL

      SELECT 'membership',
             'whop:' || id::text,
             email,
             COALESCE(product_title, plan_id, 'Membership'),
             COALESCE(whop_created_at, created_at),
             'whop',
             NULL
      FROM whop_memberships
      ORDER BY COALESCE(whop_created_at, created_at) DESC
      LIMIT $1

      UNION ALL

      SELECT 'triage',
             'triage:' || id::text,
             lead_email,
             COALESCE(source, 'Booking') || ' (' || COALESCE(status, 'open') || ')',
             COALESCE(start_time, created_at),
             'triage',
             NULL
      FROM triage_tickets
      ORDER BY COALESCE(start_time, created_at) DESC
      LIMIT $1

      UNION ALL

      SELECT 'lead',
             'lead:' || email,
             email,
             'Lead created',
             created_at,
             'crm',
             NULL
      FROM leads
      ORDER BY created_at DESC
      LIMIT $1
    )
    SELECT r.event_id AS id,
           r.email,
           l.name AS lead_name,
           r.action_type,
           r.title,
           r.source_system,
           r.created_at,
           r.value
    FROM recent r
    LEFT JOIN leads l ON LOWER(l.email) = LOWER(r.email)
    WHERE r.email IS NOT NULL AND TRIM(r.email) <> ''
    ORDER BY r.created_at DESC
    LIMIT $2
    `,
    [perSource, limit]
  );

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.lead_name ?? null,
    actionType: r.action_type,
    title: formatHyrosTitle(r.title, r.action_type),
    sourceSystem: r.source_system,
    occurredAt: r.created_at?.toISOString?.() ?? r.created_at,
    value: r.value != null ? Number(r.value) : null,
  }));
}
