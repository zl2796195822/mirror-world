export type ClientWorldSnapshot = {
  schemaVersion: string;
  worldId: string;
  worldTime: string;
  worldSeq: string;
  worldStatus: string;
  generatedAt?: string;
  places: Array<{
    placeId: string;
    placeKey: string;
    placeType: string;
    displayName: string;
    parentPlaceId: string | null;
    residentCount: number;
  }>;
  residents: Array<{
    residentId: string;
    displayName: string;
    placeId: string;
    placeKey: string | null;
    placeKind: string | null;
    activity: string;
    activityInstanceId: string | null;
    activityStartedAtWorldTime: string | null;
    activityDueAtWorldTime: string | null;
    targetPlaceId: string | null;
    participantId: string | null;
    employmentStatus: string | null;
    workplaceId: string | null;
    projectionSeq: string;
  }>;
};

export type ClientEventFeed = {
  schemaVersion: string;
  worldId: string;
  worldSeq: string;
  events: Array<{
    eventId: string;
    worldSeq: string;
    eventType: string;
    occurredAtWorldTime: string;
    residentId: string | null;
    participantId: string | null;
    placeId: string | null;
    targetPlaceId: string | null;
    payloadSummary?: Record<string, string | number | boolean | null>;
  }>;
  nextAfterSeq: string;
};

export type ClientObserverBundle =
  | {
      status: "READY";
      snapshot: ClientWorldSnapshot;
      events: ClientEventFeed;
      connection: "CONNECTED";
    }
  | {
      status: "UNAVAILABLE";
      reason: string;
      connection: "STALE" | "RECONNECTING";
    };

function apiBaseUrl(): string {
  return (
    process.env.MIRROR_API_BASE_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:3001"
  );
}

function defaultWorldId(): string | null {
  return process.env.MIRROR_WORLD_ID || null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function resolveWorldId(): Promise<string | null> {
  const configured = defaultWorldId();
  if (configured) return configured;

  try {
    const body = await fetchJson<{
      data: { worlds: Array<{ id: string }> };
    }>(`${apiBaseUrl()}/api/v1/worlds`);
    return body.data.worlds[0]?.id ?? null;
  } catch {
    return null;
  }
}

export async function loadClientObserverBundle(): Promise<ClientObserverBundle> {
  try {
    const worldId = await resolveWorldId();
    if (!worldId) {
      return {
        status: "UNAVAILABLE",
        reason: "NO_WORLD",
        connection: "STALE",
      };
    }

    const [snapshotBody, eventsBody] = await Promise.all([
      fetchJson<{ data: { snapshot: ClientWorldSnapshot } }>(
        `${apiBaseUrl()}/api/v1/client/v0/worlds/${worldId}/snapshot`,
      ),
      fetchJson<{ data: { feed: ClientEventFeed } }>(
        `${apiBaseUrl()}/api/v1/client/v0/worlds/${worldId}/events?limit=30`,
      ),
    ]);

    return {
      status: "READY",
      snapshot: snapshotBody.data.snapshot,
      events: eventsBody.data.feed,
      connection: "CONNECTED",
    };
  } catch {
    return {
      status: "UNAVAILABLE",
      reason: "PROJECTION_UNAVAILABLE",
      connection: "RECONNECTING",
    };
  }
}

export function formatWorldClock(worldTime: string): {
  dayLabel: string;
  timeLabel: string;
} {
  const date = new Date(worldTime);
  if (Number.isNaN(date.getTime())) {
    return { dayLabel: "World Date —", timeLabel: "--:--" };
  }
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return {
    dayLabel: `World Date ${year}-${month}-${day}`,
    timeLabel: `${hours}:${minutes}`,
  };
}

export function shortId(value: string | null | undefined): string {
  if (!value) return "—";
  return value.slice(0, 8).toUpperCase();
}

export function activityCounts(
  residents: ClientWorldSnapshot["residents"],
): Record<string, number> {
  const counts: Record<string, number> = {
    MOVE: 0,
    TRAVELING: 0,
    SLEEP: 0,
    SLEEPING: 0,
    EAT: 0,
    EATING: 0,
    WORK: 0,
    WORKING: 0,
    TALK: 0,
    TALKING: 0,
    IDLE: 0,
  };
  for (const resident of residents) {
    switch (resident.activity) {
      case "TRAVELING":
        counts.MOVE += 1;
        counts.TRAVELING += 1;
        break;
      case "SLEEPING":
        counts.SLEEP += 1;
        counts.SLEEPING += 1;
        break;
      case "EATING":
        counts.EAT += 1;
        counts.EATING += 1;
        break;
      case "WORKING":
        counts.WORK += 1;
        counts.WORKING += 1;
        break;
      case "TALKING":
        counts.TALK += 1;
        counts.TALKING += 1;
        break;
      default:
        counts.IDLE += 1;
        break;
    }
  }
  return counts;
}
