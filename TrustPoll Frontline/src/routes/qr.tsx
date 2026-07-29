import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import { ShieldCheck } from "lucide-react";

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

  useEffect(() => {
    setTargetUrl(getQrTargetUrl());
  }, []);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(targetUrl)}`;

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

        <div className="mt-6 flex items-center gap-2 text-xs font-medium text-emerald-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span>Live 3-Minute Expiry Token Generator</span>
        </div>

        {/* Organizer Footer Bar */}
        <div className="mt-8 pt-6 border-t border-border/60 w-full flex items-center justify-between text-xs text-muted-foreground font-semibold">
          <Link to="/" className="hover:text-foreground transition-colors">
            ← Home
          </Link>
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
