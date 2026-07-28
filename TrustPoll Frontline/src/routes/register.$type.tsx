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

function friendlyError(raw: string): string {
  if (raw.includes("voter_type, name, and identifier are required.")) {
    return "Please fill in all required fields before continuing.";
  }
  if (raw.includes("You have already voted.") || raw.includes("already cast a vote") || raw.includes("already been used to cast a vote")) {
    return "This device or identifier has already cast a vote.";
  }
  if (raw.includes("Token is missing") || raw.includes("Invalid voting token")) {
    return "Your voting link is missing or invalid. Please scan the QR code again.";
  }
  if (raw.includes("expired")) {
    return "Your voting link has expired. Please scan a fresh QR code.";
  }
  if (raw.includes("different device")) {
    return "This voting link was opened on another device. Open it on the original device.";
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
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [position, setPosition] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!name.trim()) return "Name is required.";
    if (voterType === "guest") {
      if (!organisation.trim()) return "Organisation / Business Name is required.";
      if (!position.trim()) return "Position / Designation is required.";
    }
    if (voterType === "faculty") {
      if (!department.trim()) return "Department is required.";
    }
    if (voterType === "student") {
      if (!year.trim()) return "Year is required.";
      if (!department.trim()) return "Department is required.";
    }
    return null;
  }

  // Build a unique identifier from the filled fields (used for duplicate detection)
  function buildIdentifier(): string {
    if (voterType === "guest") return `${name.trim()}|${organisation.trim()}`;
    if (voterType === "faculty") return `${name.trim()}|${department.trim()}`;
    // student
    return `${name.trim()}|${year.trim()}|${department.trim()}`;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: RegisterVoterPayload = {
      voter_type: voterType,
      name: name.trim(),
      identifier: buildIdentifier(),
      token,
    };
    if (voterType === "student") {
      payload.department = department.trim();
      payload.year = year.trim();
    }
    if (voterType === "faculty") {
      payload.department = department.trim();
    }
    if (voterType === "guest") {
      payload.organisation = organisation.trim();
      payload.position = position.trim();
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
        {/* Name — common to all types */}
        <Field label="Full name" htmlFor="name" required>
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

        {/* ----- Guest fields ----- */}
        {voterType === "guest" && (
          <>
            <Field label="Organisation / Business Name" htmlFor="organisation" required>
              <input
                id="organisation"
                type="text"
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Position / Designation" htmlFor="position" required>
              <input
                id="position"
                type="text"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="input"
                required
              />
            </Field>
          </>
        )}

        {/* ----- Faculty fields ----- */}
        {voterType === "faculty" && (
          <Field label="Department" htmlFor="department" required>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="input"
              required
            />
          </Field>
        )}

        {/* ----- Student fields ----- */}
        {voterType === "student" && (
          <>
            <Field label="Year" htmlFor="year" required>
              <input
                id="year"
                type="text"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="input"
                required
              />
            </Field>
            <Field label="Department" htmlFor="department" required>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input"
                required
              />
            </Field>
          </>
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
  required = false,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </span>
      {children}
    </label>
  );
}

