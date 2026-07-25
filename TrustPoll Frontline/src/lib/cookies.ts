// Client-side cookie helpers for TrustPoll guard logic.
export const VOTED_COOKIE = "trustpoll_voted";

export function hasVotedCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${VOTED_COOKIE}=`));
}
