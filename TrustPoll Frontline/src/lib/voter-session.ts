// Simple in-memory + sessionStorage handoff between voter-facing pages.
import type { VoterType } from "./api";

const KEY = "trustpoll.voter";

export interface VoterSession {
  voter_id: string;
  voter_type: VoterType;
  name: string;
  token?: string;
}

export function saveVoter(v: VoterSession) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(v));
}

export function loadVoter(): VoterSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as VoterSession;
  } catch {
    return null;
  }
}

export const getVoter = loadVoter;

export function clearVoter() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
