import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/confirmation")({
  head: () => ({
    meta: [
      { title: "Vote recorded — TrustPoll" },
      { name: "description", content: "Your vote has been recorded." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    server: typeof search.server === "string" ? search.server : "",
  }),
  component: ConfirmationPage,
});

function setVotedCookie() {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `trustpoll_voted=1; expires=${expires}; path=/; SameSite=Lax`;
}

function ConfirmationPage() {
  const { server } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    setVotedCookie();

    // Prevent back-navigation to the voting form. Push a sentinel state so
    // the first "back" pops into our own entry, which we then re-forward.
    const url = `${window.location.pathname}${window.location.search}`;
    window.history.pushState({ trustpollConfirmation: true }, "", url);

    const onPopState = () => {
      // User hit back — shove them forward to this same confirmation screen.
      window.history.pushState({ trustpollConfirmation: true }, "", url);
      navigate({ to: "/confirmation", search: { server }, replace: true });
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navigate, server]);

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-10 flex flex-col items-center justify-center text-center">
      <div className="text-3xl">✅</div>
      <h1 className="mt-4 text-xl font-semibold">Vote recorded successfully</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Thanks for participating in the Network Expo.
      </p>
      {server && (
        <div className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
          Handled by <span className="font-medium text-foreground">{server}</span>
        </div>
      )}
      <Link
        to="/dashboard"
        className="mt-8 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        View live results
      </Link>
    </div>
  );
}
