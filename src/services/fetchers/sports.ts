export type SportsMatchStatus =
  | "SCHEDULED"
  | "LIVE"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELED"
  | "UNKNOWN";

export type SportsMatch = {
  id: string;
  competition: string;
  competitionCountry: string | null;
  kickoffAt: string;
  status: SportsMatchStatus;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

export type SportsProvider = "football-data" | "thesportsdb";

export type SportsFetchResult = {
  date: string;
  source: SportsProvider;
  matches: SportsMatch[];
  warning?: string;
};

type FetchSportsTodayOptions = {
  date?: string | null;
  limit?: number;
};

type FootballDataMatch = {
  id?: number;
  utcDate?: string;
  status?: string;
  competition?: {
    name?: string;
    area?: {
      name?: string;
    };
  };
  homeTeam?: {
    name?: string;
  };
  awayTeam?: {
    name?: string;
  };
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    };
  };
};

type FootballDataResponse = {
  matches?: FootballDataMatch[];
};

type SportsDbEvent = {
  idEvent?: string;
  strEvent?: string;
  strLeague?: string;
  strCountry?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  dateEvent?: string;
  strTime?: string;
  strStatus?: string;
};

type SportsDbResponse = {
  events?: SportsDbEvent[] | null;
};

const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const THESPORTSDB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

function toIsoDate(input?: string | null) {
  if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  return new Date().toISOString().slice(0, 10);
}

function clampLimit(input?: number) {
  if (!Number.isFinite(input)) {
    return 8;
  }

  const value = Math.floor(input as number);
  return Math.min(Math.max(value, 1), 30);
}

function parseScore(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeStatus(rawStatus?: string): SportsMatchStatus {
  if (!rawStatus) return "UNKNOWN";

  const status = rawStatus.trim().toLowerCase();

  if (
    status === "timed" ||
    status === "scheduled" ||
    status === "not started" ||
    status === "ns"
  ) {
    return "SCHEDULED";
  }

  if (
    status === "in_play" ||
    status === "paused" ||
    status === "live" ||
    status === "1h" ||
    status === "2h" ||
    status === "ht"
  ) {
    return "LIVE";
  }

  if (
    status === "finished" ||
    status === "match finished" ||
    status === "ft" ||
    status === "after penalties" ||
    status === "aet"
  ) {
    return "FINISHED";
  }

  if (status === "postponed" || status === "suspended") {
    return "POSTPONED";
  }

  if (status === "cancelled" || status === "canceled") {
    return "CANCELED";
  }

  return "UNKNOWN";
}

function getPreferredProvider(): SportsProvider {
  const configured = process.env.SPORTS_API_PROVIDER?.trim().toLowerCase();

  if (configured === "football-data" || configured === "football_data") {
    return "football-data";
  }

  if (configured === "thesportsdb" || configured === "sportsdb") {
    return "thesportsdb";
  }

  return process.env.FOOTBALL_DATA_API_KEY ? "football-data" : "thesportsdb";
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function buildFallbackMatchId(prefix: string, index: number) {
  return `${prefix}-${index + 1}`;
}

function mapFootballDataMatch(match: FootballDataMatch, index: number): SportsMatch {
  return {
    id: match.id ? String(match.id) : buildFallbackMatchId("fd", index),
    competition: match.competition?.name || "Football",
    competitionCountry: match.competition?.area?.name || null,
    kickoffAt: match.utcDate || new Date().toISOString(),
    status: normalizeStatus(match.status),
    homeTeam: match.homeTeam?.name || "Home",
    awayTeam: match.awayTeam?.name || "Away",
    homeScore: match.score?.fullTime?.home ?? null,
    awayScore: match.score?.fullTime?.away ?? null,
  };
}

async function fetchFromFootballData(date: string, limit: number): Promise<SportsMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not configured");
  }

  const endpoint = new URL(`${FOOTBALL_DATA_BASE_URL}/matches`);
  endpoint.searchParams.set("dateFrom", date);
  endpoint.searchParams.set("dateTo", date);

  const response = await fetch(endpoint.toString(), {
    headers: {
      "X-Auth-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await parseJsonSafe<{ message?: string }>(response);
    const message = payload?.message || `football-data request failed (${response.status})`;
    throw new Error(message);
  }

  const payload = await parseJsonSafe<FootballDataResponse>(response);
  const matches = payload?.matches || [];

  return matches
    .slice(0, limit)
    .map((match, index) => mapFootballDataMatch(match, index));
}

function mapSportsDbEvent(event: SportsDbEvent, index: number, date: string): SportsMatch {
  const timePart = event.strTime && event.strTime.trim() ? event.strTime.trim() : "00:00:00";
  const datePart = event.dateEvent && event.dateEvent.trim() ? event.dateEvent.trim() : date;

  let kickoffAt = `${datePart}T${timePart}Z`;
  if (Number.isNaN(new Date(kickoffAt).getTime())) {
    kickoffAt = `${datePart}T00:00:00.000Z`;
  }

  return {
    id: event.idEvent || buildFallbackMatchId("tsdb", index),
    competition: event.strLeague || "Football",
    competitionCountry: event.strCountry || null,
    kickoffAt,
    status: normalizeStatus(event.strStatus),
    homeTeam: event.strHomeTeam || "Home",
    awayTeam: event.strAwayTeam || "Away",
    homeScore: parseScore(event.intHomeScore),
    awayScore: parseScore(event.intAwayScore),
  };
}

async function fetchFromSportsDb(date: string, limit: number): Promise<SportsMatch[]> {
  const endpoint = new URL(`${THESPORTSDB_BASE_URL}/eventsday.php`);
  endpoint.searchParams.set("d", date);
  endpoint.searchParams.set("s", "Soccer");

  const response = await fetch(endpoint.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`TheSportsDB request failed (${response.status})`);
  }

  const payload = await parseJsonSafe<SportsDbResponse>(response);
  const events = payload?.events || [];

  return events
    .slice(0, limit)
    .map((event, index) => mapSportsDbEvent(event, index, date));
}

export async function fetchSportsTodayMatches(
  options: FetchSportsTodayOptions = {}
): Promise<SportsFetchResult> {
  const date = toIsoDate(options.date);
  const limit = clampLimit(options.limit);
  const preferredProvider = getPreferredProvider();

  if (preferredProvider === "football-data") {
    try {
      const matches = await fetchFromFootballData(date, limit);
      return {
        date,
        source: "football-data",
        matches,
      };
    } catch (error: unknown) {
      const fallbackMatches = await fetchFromSportsDb(date, limit);
      const message = error instanceof Error ? error.message : "football-data unavailable";
      return {
        date,
        source: "thesportsdb",
        matches: fallbackMatches,
        warning: `football-data unavailable: ${message}`,
      };
    }
  }

  try {
    const matches = await fetchFromSportsDb(date, limit);
    return {
      date,
      source: "thesportsdb",
      matches,
    };
  } catch (error: unknown) {
    if (process.env.FOOTBALL_DATA_API_KEY) {
      const fallbackMatches = await fetchFromFootballData(date, limit);
      const message = error instanceof Error ? error.message : "TheSportsDB unavailable";
      return {
        date,
        source: "football-data",
        matches: fallbackMatches,
        warning: `TheSportsDB unavailable: ${message}`,
      };
    }

    throw error;
  }
}
