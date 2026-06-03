import type { DregsProfile } from "./dregs";

export type JourneyEvent = {
  id: string;
  type: string;
  title: string;
  source: string;
  sourceSystem: string;
  occurredAt: string;
  pageUrl?: string | null;
  value?: number | null;
  currency?: string | null;
  attribution?: Record<string, unknown> | null;
  payload?: unknown;
  meta?: Record<string, unknown>;
};

export type LinkedIdentity = {
  email: string;
  name?: string | null;
  phone?: string | null;
  linkReason: string;
  crmLeadId?: string | null;
};


export type LeadProfile = {
  email: string;
  name?: string | null;
  phone?: string | null;
  country?: string | null;
  utmSource?: string | null;
  crmLeadId?: string | null;
  disposition?: string | null;
  createdAt?: string | null;
  dubId?: string | null;
  hyrosLeadId?: string | null;
  dregs?: DregsProfile | null;
};

export type JourneySummary = {
  totalEvents: number;
  hyrosOptins: number;
  hyrosSales: number;
  hyrosCalls: number;
  bookedCalls: number;
  crmSales: number;
  whopMemberships: number;
  totalRevenue: number;
  lifecycleStage: string;
  linkedEmails: number;
  attributionSources: string[];
};

export type JourneyResult = {
  query: string;
  matchType: string;
  profile: LeadProfile | null;
  linkedIdentities: LinkedIdentity[];
  events: JourneyEvent[];
  summary: JourneySummary;
};

export type SearchSuggestion = {
  email: string;
  name?: string | null;
  phone?: string | null;
  eventCount?: number;
};

export type RecentActivityItem = {
  id: string;
  email: string;
  name: string | null;
  actionType: string;
  title: string;
  sourceSystem: string;
  occurredAt: string;
  value: number | null;
};
