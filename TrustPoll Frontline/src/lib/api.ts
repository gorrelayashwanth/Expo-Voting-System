// Centralized API client for TrustPoll.
// All requests go to VITE_API_BASE_URL. Never hardcode URLs elsewhere.

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "";

// Device fingerprint is populated by a shared utility (FingerprintJS wired
// separately). Read it lazily so all POSTs stay in sync.
let deviceFingerprint = "";
export function setDeviceFingerprint(fp: string) {
  deviceFingerprint = fp;
}
export function getDeviceFingerprint() {
  return deviceFingerprint;
}

type Options = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  includeFingerprint?: boolean;
};

export async function apiFetch<T>(path: string, opts: Options = {}): Promise<T> {
  const { method = "GET", body, signal, includeFingerprint = false } = opts;

  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not configured. Set it in your .env file.",
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (includeFingerprint) {
    let fp = getDeviceFingerprint();
    if (!fp && typeof window !== "undefined") {
      const { initDeviceFingerprint } = await import("./fingerprint");
      fp = await initDeviceFingerprint();
    }
    headers["X-Device-Fingerprint"] = fp;
  }


  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) msg = data.message;
      else if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  // Some endpoints (chatbot) return text/plain
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

// -------------- Typed endpoint helpers --------------

export type VoterType = "guest" | "faculty" | "student";

export interface RegisterVoterPayload {
  voter_type: VoterType;
  name: string;
  identifier?: string;
  department?: string;
  year?: string;
  organisation?: string;
  position?: string;
  token?: string;
}

export interface RegisterVoterResponse {
  voter_id: string;
  token?: string;
}


export interface Project {
  id: string;
  project_number: string | number;
  title: string;
  team_name?: string | null;
  created_at?: string;
}


export interface VoteResponse {
  handled_by_server: string;
  response_time_ms?: number;
}

export type ServerStatusValue = "up" | "down";

export interface ServerHealth {
  avg_response_time_ms: number | null;
  history: number[];
  consecutive_failures: number;
  status: ServerStatusValue;
}

export interface DashboardProjectVote {
  id: string;
  project_number: number | string;
  title: string;
  votes: number;
}

export interface DashboardRecentVote {
  id: string;
  title: string;
  handled_by_server: string;
  response_time_ms: number;
}

export interface DashboardSummary {
  totalVotes: number;
  projectVotes: DashboardProjectVote[];
  recentVotes: DashboardRecentVote[];
  servers: {
    server_1: ServerHealth;
    server_2: ServerHealth;
    [key: string]: ServerHealth;
  };
}


export const api = {
  registerVoter: (payload: RegisterVoterPayload) =>
    apiFetch<RegisterVoterResponse>("/api/register-voter", {
      method: "POST",
      body: payload,
      includeFingerprint: true,
    }),
  listProjects: (signal?: AbortSignal) =>
    apiFetch<Project[]>("/api/projects", { signal }),
  vote: (voter_id: string, project_id: string, token?: string) =>
    apiFetch<VoteResponse>("/api/vote", {
      method: "POST",
      body: { voter_id, project_id, token },
      includeFingerprint: true,
    }),

  dashboardSummary: (signal?: AbortSignal) =>
    apiFetch<DashboardSummary>("/api/dashboard-summary", { signal }),
  chatbotQuery: (question: string, signal?: AbortSignal) =>
    apiFetch<{ response: string }>("/api/chatbot-query", {
      method: "POST",
      body: { question },
      signal,
    }),
};
