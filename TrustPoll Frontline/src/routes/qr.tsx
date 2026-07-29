import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import { QrCode, ExternalLink, ShieldCheck, Copy, Check } from "lucide-react";

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
  function getQrTargetUrl(): string {
    if (typeof window !== "undefined" && window.location.protocol === "https:") {
      return "https://trustpoll-lb.onrender.com/start-vote";
    }
    const base = API_BASE_URL && !API_BASE_URL.includes("localhost")
      ? API_BASE_URL
      : "https://trustpoll-lb.onrender.com";
    return `${base}/start-vote`;
  }

  const [targetUrl, setTargetUrl] = useState(getQrTargetUrl);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTargetUrl(getQrTargetUrl());
  }, []);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(targetUrl)}`;

  function copyUrl() {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8 text-foreground font-sans antialiased">
      <div className="max-w-md w-full rounded-2xl border border-border/80 bg-card/90 p-8 shadow-2xl text-center flex flex-col items-center backdrop-blur-xl">
        {/* Kiosk Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
          <ShieldCheck className="h-3.5 w-3.5" /> Official Booth Voting Kiosk
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Scan to Vote</h1>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed max-w-xs">
          Point your mobile phone camera at the QR code to issue your secure 3-minute voting token.
        </p>

        {/* Holographic QR Frame */}
        <div className="relative mt-6 p-5 rounded-2xl border border-emerald-500/30 bg-white shadow-xl flex items-center justify-center group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 blur opacity-75 group-hover:opacity-100 transition-opacity" />
          <img
            src={qrImageUrl}
            alt="Voting QR Code"
            width={240}
            height={240}
            className="relative rounded-xl"
          />
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs font-medium text-emerald-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Live 3-Minute Expiry Token Generator</span>
        </div>

        {/* Editable Target URL */}
        <div className="mt-6 w-full text-left space-y-1.5">
          <label htmlFor="target-url" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Target Endpoint URL
          </label>
          <div className="flex gap-2">
            <input
              id="target-url"
              type="text"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3.5 text-xs font-mono outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              type="button"
              onClick={copyUrl}
              className="h-10 px-3.5 rounded-xl border border-border bg-secondary text-xs font-semibold hover:border-foreground/40 transition-colors flex items-center gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Organizer Footer Bar */}
        <div className="mt-8 pt-6 border-t border-border/60 w-full flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <Link to="/" className="hover:text-foreground transition-colors">
            ← Home
          </Link>
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-emerald-400 transition-colors"
          >
            Direct Link <ExternalLink className="h-3 w-3" />
          </a>
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
