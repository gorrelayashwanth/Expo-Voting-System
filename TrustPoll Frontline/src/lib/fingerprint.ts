// Device fingerprint bootstrap. Uses open-source FingerprintJS to produce a
// stable per-browser visitorId, cached in localStorage so subsequent loads
// are instant. Falls back to a crypto-random ID (persisted) only if
// FingerprintJS itself fails to load — never a "dev-" placeholder.
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { setDeviceFingerprint } from "./api";

const STORAGE_KEY = "trustpoll.device_fp";

let initPromise: Promise<string> | null = null;

export function initDeviceFingerprint(): Promise<string> {
  if (typeof window === "undefined") return Promise.resolve("");
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setDeviceFingerprint(cached);
      return cached;
    }
    try {
      const fp = await FingerprintJS.load();
      const { visitorId } = await fp.get();
      localStorage.setItem(STORAGE_KEY, visitorId);
      setDeviceFingerprint(visitorId);
      return visitorId;
    } catch {
      const rand = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(STORAGE_KEY, rand);
      setDeviceFingerprint(rand);
      return rand;
    }
  })();

  return initPromise;
}
