import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { api, type VoterType, type RegisterVoterPayload } from "@/lib/api";
import { saveVoter } from "@/lib/voter-session";
import { hasVotedCookie } from "@/lib/cookies";


const voterTypeSchema = z.enum(["guest", "faculty", "student"]);

export const Route = createFileRoute("/register/$type")({
  head: () => ({
    meta: [
      { title: "Register to vote — TrustPoll" },
      { name: "description", content: "Enter your details to receive a ballot." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: RegisterPage,
});

const TITLES: Record<VoterType, string> = {
  guest: "Guest registration",
  faculty: "Faculty registration",
  student: "Student registration",
};

const IDENTIFIER_LABELS: Record<VoterType, string> = {
  guest: "ID / Reference",
  faculty: "Employee ID",
  student: "Roll Number",
};

function friendlyError(raw: string): string {
  const known = [
    "voter_type, name, and identifier are required.",
    "You have already voted.",
    "Token is missing.",
    "Token has expired.",
    "This link was opened on a different device.",
  ];
  const match = known.find((m) => raw.includes(m));
  if (match) {
    switch (match) {
      case "voter_type, name, and identifier are required.":
        return "Please fill in your name and identifier before continuing.";
      case "You have already voted.":
        return "This device or identifier has already cast a vote.";
      case "Token is missing.":
        return "Your voting link is missing its token. Please scan the QR code again.";
      case "Token has expired.":
        return "Your voting link has expired. Please scan a fresh QR code.";
      case "This link was opened on a different device.":
        return "This voting link was opened on another device. Open it on the original device.";
    }
  }
  return raw || "Something went wrong. Please try again.";
}

function RegisterPage() {
  const params = Route.useParams();
  const { token } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (hasVotedCookie()) navigate({ to: "/", replace: true });
  }, [navigate]);


  const parsed = voterTypeSchema.safeParse(params.type);
  if (!parsed.success) {
    return (
      <div className="min-h-screen max-w-md mx-auto px-5 py-10">
        <h1 className="text-xl font-semibold">Invalid identity type</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please return to the start and pick Guest, Faculty, or Student.
        </p>
      </div>
    );
  }
  const voterType = parsed.data;

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !identifier.trim()) {
      setError("Please fill in your name and identifier before continuing.");
      return;
    }

    const payload: RegisterVoterPayload = {
      voter_type: voterType,
      name: name.trim(),
      identifier: identifier.trim(),
      token,
    };
    if (voterType === "student") {
      if (department.trim()) payload.department = department.trim();
      if (year.trim()) payload.year = year.trim();
    }
    if (voterType === "faculty") {
      if (department.trim()) payload.department = department.trim();
      if (position.trim()) payload.position = position.trim();
    }
    if (voterType === "guest") {
      if (organisation.trim()) payload.organisation = organisation.trim();
    }

    setSubmitting(true);
    try {
      const res = await api.registerVoter(payload);
      const activeToken = res.token || token;
      saveVoter({ voter_id: res.voter_id, voter_type: voterType, name: payload.name, token: activeToken });
      navigate({ to: "/projects" });

    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-5 py-10 w-full">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {TITLES[voterType]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your details to receive a ballot.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Full name" htmlFor="name">
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            required
          />
        </Field>

        <Field label={IDENTIFIER_LABELS[voterType]} htmlFor="identifier">
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="input"
            required
          />
        </Field>

        {voterType === "student" && (
          <>
            <Field label="Department" htmlFor="department">
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Year" htmlFor="year">
              <input
                id="year"
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="input"
              />
            </Field>
          </>
        )}

        {voterType === "faculty" && (
          <>
            <Field label="Department" htmlFor="department">
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Position" htmlFor="position">
              <input
                id="position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="input"
              />
            </Field>
          </>
        )}

        {voterType === "guest" && (
          <Field label="Organisation" htmlFor="organisation">
            <input
              id="organisation"
              type="text"
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              className="input"
            />
          </Field>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 h-11 w-full rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
        >
          {submitting ? "Registering…" : "Continue"}
        </button>
      </form>

      <style>{`
        .input {
          height: 44px;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 0 0.875rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 120ms ease;
        }
        .input:focus {
          border-color: hsl(var(--foreground) / 0.6);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
