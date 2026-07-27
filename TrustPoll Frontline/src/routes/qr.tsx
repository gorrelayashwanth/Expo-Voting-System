import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import { QrCode, RefreshCw, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/qr")({
  head: () => ({
    meta: [
      { title: "Scan to Vote — TrustPoll Kiosk" },
      { name: "description", content: "Scan QR code to open a 3-minute voting ballot." },
    ],
  }),
  component: QRKioskPage,
});

function QRKioskPage() {
  const defaultTarget = typeof window !== "undefined"
    ? `${API_BASE_URL || window.location.origin}/start-vote`
    : "http://localhost:4000/start-vote";

  const [targetUrl, setTargetUrl] = useState(defaultTarget);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (API_BASE_URL) {
      setTargetUrl(`${API_BASE_URL}/start-vote`);
    } else if (typeof window !== "undefined") {
      setTargetUrl(`${window.location.origin}/start-vote`);
    }
  }, []);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(targetUrl)}`;

  function copyUrl() {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 text-foreground">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 shadow-card text-center flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mb-4">
          <QrCode className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight">Scan to Vote</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Point your phone camera at the QR code to open your secure 3-minute voting ballot.
        </p>

        {/* QR Code Container */}
        <div className="mt-6 p-4 rounded-xl border border-border bg-white shadow-sm flex items-center justify-center">
          <img
            src={qrImageUrl}
            alt="Voting QR Code"
            width={260}
            height={260}
            className="rounded-lg border-0"
          />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Generates 3-minute time-limited ballot tokens</span>
        </div>

        {/* Configurable target URL input for Cloudflare Tunnel / local dev */}
        <div className="mt-6 w-full text-left space-y-1.5">
          <label htmlFor="target-url" className="text-xs font-medium text-muted-foreground">
            Ballot Start URL (editable for Cloudflare Tunnel / Render)
          </label>
          <div className="flex gap-2">
            <input
              id="target-url"
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-xs font-mono outline-none focus:border-foreground/60"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="h-9 px-3 rounded-lg border border-border bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border w-full flex items-center justify-between text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">
            ← Home
          </Link>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:underline"
          >
            Open Link <ExternalLink className="h-3 w-3" />
          </a>
          <Link to="/dashboard" className="hover:underline">
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
