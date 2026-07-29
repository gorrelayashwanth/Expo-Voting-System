// Client-side cookie helpers for TrustPoll guard logic.
export const VOTED_COOKIE = "trustpoll_voted";

export function hasVotedCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${VOTED_COOKIE}=`));
}

export function setVotedCookie(): void {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${VOTED_COOKIE}=1; expires=${expires}; path=/; SameSite=Lax`;
}

export function clearVotedCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${VOTED_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
