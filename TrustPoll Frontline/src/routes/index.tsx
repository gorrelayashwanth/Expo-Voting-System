import { createFileRoute, Link } from "@tanstack/react-router";
import { User, GraduationCap, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { hasVotedCookie } from "@/lib/cookies";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "TrustPoll — Cast your vote" },
      {
        name: "description",
        content:
          "Vote for your favorite Network Expo project. Choose your identity to begin.",
      },
      { property: "og:title", content: "TrustPoll — Cast your vote" },
      {
        property: "og:description",
        content: "Live voting for the college Network Expo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IdentitySelection,
});

const options = [
  { type: "guest", label: "Guest", icon: User, desc: "Visitor from outside campus" },
  { type: "faculty", label: "Faculty", icon: Users, desc: "Teaching staff" },
  { type: "student", label: "Student", icon: GraduationCap, desc: "Enrolled student" },
] as const;

function IdentitySelection() {
  const { token } = Route.useSearch();
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAlreadyVoted(hasVotedCookie());
    setChecked(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col px-5 py-10 max-w-md mx-auto w-full">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">TrustPoll</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Select your identity to cast a vote.
        </p>
      </header>

      {checked && alreadyVoted ? (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card text-center">
          <div className="text-2xl">✅</div>
          <p className="mt-3 text-base font-medium">
            You've already voted. Thank you for participating!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {options.map(({ type, label, icon: Icon, desc }) => (
            <Link
              key={type}
              to="/register/$type"
              params={{ type }}
              search={{ token }}
              className="group flex items-center gap-4 rounded-xl bg-card p-6 shadow-card border border-border transition-colors hover:border-foreground/40 min-h-[80px]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="text-base font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <div className="text-muted-foreground text-lg group-hover:text-foreground">
                →
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-auto pt-10 text-xs text-muted-foreground text-center">
        Network Expo · Live Voting
      </p>
    </div>
  );
}
