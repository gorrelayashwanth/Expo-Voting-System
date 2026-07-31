import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { api, type VoterType, type RegisterVoterPayload } from "@/lib/api";
import { saveVoter } from "@/lib/voter-session";
import { hasVotedCookie } from "@/lib/cookies";
import { UserCheck, Shield, ArrowRight, Sparkles } from "lucide-react";

const voterTypeSchema = z.enum(["guest", "faculty", "student"]);

export const Route = createFileRoute("/register/$type")({
  head: () => ({
    meta: [
      { title: "Registration — TrustPoll" },
      { name: "description", content: "Enter attendee credentials to receive a ballot." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: RegisterPage,
});

const TITLES: Record<VoterType, string> = {
  guest: "Guest Visitor Credentials",
  faculty: "Faculty / Judge Credentials",
  student: "Student Registration",
};

const SUBTITLES: Record<VoterType, string> = {
  guest: "Provide your visitor & organisation details for ballot issuance.",
  faculty: "Enter your department details to receive an official judge ballot.",
  student: "Enter your academic year and department details.",
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
    // If no token is provided and browser cookie indicates voted, redirect
    if (hasVotedCookie() && !token) {
      navigate({ to: "/", replace: true });
    }
  }, [navigate, token]);

  const parsed = voterTypeSchema.safeParse(params.type);
  if (!parsed.success) {
    return (
      <div className="min-h-screen max-w-md mx-auto px-5 py-10 text-center font-sans">
        <h1 className="text-xl font-bold">Invalid Identity Category</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please return to the start page and select Guest, Faculty, or Student.
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
    if (!name.trim()) return "Full Name is required.";
    if (voterType === "guest") {
      if (!organisation.trim()) return "Organisation / Business Name is required.";
      if (!position.trim()) return "Position / Designation is required.";
    }
    if (voterType === "faculty") {
      if (!department.trim()) return "Department is required.";
    }
    if (voterType === "student") {
      if (!year.trim()) return "Academic Year is required.";
      if (!department.trim()) return "Department is required.";
    }
    return null;
  }

  function buildIdentifier(): string {
    if (voterType === "guest") return `${name.trim()}|${organisation.trim()}`;
    if (voterType === "faculty") return `${name.trim()}|${department.trim()}`;
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
    <div className="min-h-screen flex flex-col justify-between px-5 py-8 max-w-md mx-auto w-full font-sans antialiased">
      <div>
        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold mb-6">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <UserCheck className="h-4 w-4" /> Step 1 of 2
          </span>
          <span className="px-2.5 py-1 rounded-full bg-secondary text-[11px]">Identity Verification</span>
        </div>

        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">{TITLES[voterType]}</h1>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{SUBTITLES[voterType]}</p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {/* Full Name */}
          <Field label="Full Name" htmlFor="name" required>
            <input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="e.g. Alex Morgan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-style"
              required
            />
          </Field>

          {/* Guest Fields */}
          {voterType === "guest" && (
            <>
              <Field label="Organisation / Business Name" htmlFor="organisation" required>
                <input
                  id="organisation"
                  type="text"
                  placeholder="e.g. TechCorp Solutions"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  className="input-style"
                  required
                />
              </Field>
              <Field label="Position / Designation" htmlFor="position" required>
                <input
                  id="position"
                  type="text"
                  placeholder="e.g. Senior Tech Lead"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="input-style"
                  required
                />
              </Field>
            </>
          )}

          {/* Faculty Fields */}
          {voterType === "faculty" && (
            <Field label="Department" htmlFor="department" required>
              <input
                id="department"
                type="text"
                placeholder="e.g. Computer Science & Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="input-style"
                required
              />
            </Field>
          )}

          {/* Student Fields */}
          {voterType === "student" && (
            <>
              <Field label="Academic Year" htmlFor="year" required>
                <input
                  id="year"
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 4"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="input-style"
                  required
                />
              </Field>
              <Field label="Department" htmlFor="department" required>
                <input
                  id="department"
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input-style"
                  required
                />
              </Field>
            </>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3.5 text-xs text-destructive font-medium animate-fadeIn">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-4 h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-spin" /> Verifying Credentials...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Continue to Ballot <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Clean Mobile Voter Footer */}
      <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground/80">TrustPoll · Network Expo 2026</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Secure Multi-Node Distributed Voting System</p>
      </footer>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-semibold text-foreground/90">
        {label} {required && <span className="text-emerald-400">*</span>}
      </label>
      {children}
    </div>
  );
}
