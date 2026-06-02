const DREGS_BASE = "https://dregs.com";

export type DregsIdentity = {
  id: string;
  displayName?: string | null;
  displayEmail?: string | null;
  humanityScore?: number;
  authenticityScore?: number;
  uniquenessScore?: number;
  behaviorScore?: number;
  badges?: Array<{ slug: string; name: string; type: string }>;
  data?: Record<string, unknown>;
};

export type DregsDevice = {
  fingerprint: string;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
};

export type DregsProfile = {
  humanityScore?: number;
  authenticityScore?: number;
  uniquenessScore?: number;
  behaviorScore?: number;
  deviceCount: number;
  badges: string[];
};

export type DregsLinkedIdentity = {
  email: string;
  name?: string | null;
  linkReason: string;
};

type Paginated<T> = {
  content?: T[];
};

function secretKey(): string | null {
  const key = process.env.DREGS_SECRET_KEY?.trim();
  return key || null;
}

async function dregsFetch<T>(path: string): Promise<T | null> {
  const key = secretKey();
  if (!key) return null;

  try {
    const res = await fetch(`${DREGS_BASE}${path}`, {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getDregsIdentity(email: string): Promise<DregsIdentity | null> {
  return dregsFetch(`/api/identities/${encodeURIComponent(email.toLowerCase())}`);
}

export async function getDregsDevicesForIdentity(email: string): Promise<DregsDevice[]> {
  const result = await dregsFetch<Paginated<DregsDevice>>(
    `/api/devices?identity=${encodeURIComponent(email.toLowerCase())}`
  );
  return result?.content ?? [];
}

export async function getDregsIdentitiesOnDevice(fingerprint: string): Promise<DregsIdentity[]> {
  const result = await dregsFetch<Paginated<DregsIdentity>>(
    `/api/identities?device=${encodeURIComponent(fingerprint)}`
  );
  return result?.content ?? [];
}

function identityEmail(identity: DregsIdentity): string {
  return (identity.displayEmail ?? identity.id).toLowerCase();
}

function identityName(identity: DregsIdentity): string | null {
  return identity.displayName ?? (typeof identity.data?.name === "string" ? identity.data.name : null);
}

function toDregsProfile(identity: DregsIdentity, deviceCount: number): DregsProfile {
  return {
    humanityScore: identity.humanityScore,
    authenticityScore: identity.authenticityScore,
    uniquenessScore: identity.uniquenessScore,
    behaviorScore: identity.behaviorScore,
    deviceCount,
    badges: identity.badges?.map((b) => b.name) ?? [],
  };
}

export async function resolveDregsLinks(emails: string[]): Promise<{
  profile: DregsProfile | null;
  linked: DregsLinkedIdentity[];
}> {
  const normalized = [...new Set(emails.map((e) => e.toLowerCase()))];
  if (normalized.length === 0) return { profile: null, linked: [] };

  let identity: DregsIdentity | null = null;
  const devicesByFingerprint = new Map<string, DregsDevice>();

  for (const email of normalized) {
    identity = await getDregsIdentity(email);
    if (identity) {
      const devices = await getDregsDevicesForIdentity(email);
      for (const device of devices) devicesByFingerprint.set(device.fingerprint, device);
      break;
    }
  }

  if (!identity) {
    for (const email of normalized) {
      const devices = await getDregsDevicesForIdentity(email);
      for (const device of devices) devicesByFingerprint.set(device.fingerprint, device);
      if (devices.length > 0) break;
    }
  }

  const linked: DregsLinkedIdentity[] = [];
  const seen = new Set(normalized);

  for (const device of devicesByFingerprint.values()) {
    const onDevice = await getDregsIdentitiesOnDevice(device.fingerprint);
    for (const other of onDevice) {
      const email = identityEmail(other);
      if (seen.has(email)) continue;
      seen.add(email);
      linked.push({
        email,
        name: identityName(other),
        linkReason: `shared_device (dg:${device.fingerprint.slice(0, 12)}…)`,
      });
    }
  }

  return {
    profile: identity ? toDregsProfile(identity, devicesByFingerprint.size) : null,
    linked,
  };
}
