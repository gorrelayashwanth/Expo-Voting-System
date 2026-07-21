# Implementation Plan Document
### Project: TrustPoll

This document breaks the build into a strict step-by-step order, with ready-to-use prompts for your AI coding agent (e.g., Antigravity or similar). Each step is scoped small and specific — this is intentional. Feeding an AI agent one small, well-defined task at a time produces far more reliable code than one giant "build the whole app" prompt, and avoids hitting token/context limits mid-task.

**Golden rule for every prompt:** Build one layer completely, test it, THEN move to the next. Never ask the agent to build frontend + backend + database + AI features all in one go.

---

## Phase 0 — Project Setup (Do This First, Manually)

Before involving the AI agent heavily, set up the skeleton yourself:
- Create the GitHub repo with 3 folders: `/load-balancer`, `/server-app`, `/frontend`
- Initialize each as a separate Node.js project (`npm init`)
- Set up `.env` files in each folder (empty for now, fill in as you go)

---

## Phase 1 — Database First

**Why database first:** Every other layer (backend, AI logic, frontend) depends on knowing the exact data shape. Building this first prevents rework later.

**Prompt 1.1:**
> "Set up a Prisma schema for a PostgreSQL database with these tables: Projects, Voters, Votes, VoteTokens, ServerHealth. [Paste the field definitions from the Backend Schema document here]. Generate the Prisma schema file only — do not build any API routes yet."

**Prompt 1.2:**
> "Write a seed script that inserts 3 sample rows into the Projects table for local testing purposes, and 2 rows into ServerHealth (server_1, server_2, both status 'healthy'). Nothing else."

**Checkpoint:** Run migrations, confirm tables exist, confirm seed data loads correctly. Do not proceed until this works.

---

## Phase 2 — App Server (Device 2 & 3) — Core Vote Processing Only

**Why this before the load balancer:** The load balancer needs something real to forward requests to. Build the destination before the router.

**Prompt 2.1:**
> "Build a single Express.js server with one endpoint: POST /process-vote. It should accept a JSON body with voter_id and project_id, write a new row to the Votes table using Prisma, and return a success response with handled_by_server set to an environment variable SERVER_ID. Do not add any other endpoints yet."

**Prompt 2.2:**
> "Add a GET /health endpoint to this same server that returns { status: 'healthy', avg_response_time_ms: <calculated value> } based on the last 10 requests processed. Keep this simple — track response times in an in-memory array."

**Checkpoint:** Test with Postman — send a vote, confirm it's saved to DB, confirm /health responds correctly. Duplicate this server folder for Device 3, changing only SERVER_ID in .env.

---

## Phase 3 — Load Balancer (Device 1) — Basic Routing First (No AI Yet)

**Why no AI yet:** Get simple, reliable routing working first. AI logic is a refinement layered on top later — building it first risks debugging two unknowns (routing + AI logic) simultaneously.

**Prompt 3.1:**
> "Build an Express.js server that acts as a load balancer. It should have one endpoint, POST /api/vote, that forwards the request body to either http://[server2-ip]:PORT/process-vote or http://[server3-ip]:PORT/process-vote using simple round-robin alternation. Return whatever response comes back from the app server."

**Prompt 3.2:**
> "Add a background function that pings GET /health on both app servers every 2 seconds, storing their status and response time in memory (or in the ServerHealth table via Prisma). Do not change the routing logic yet — just collect the health data."

**Checkpoint:** Confirm votes alternate between Server 2 and 3 correctly, confirm health data is being collected and logged to console.

---

## Phase 4 — Upgrade Routing to AI-Assisted (Smart Load Balancing)

**Prompt 4.1:**
> "Replace the round-robin logic in the load balancer with a function that checks the current avg_response_time_ms for both servers (from the health data already being collected) and routes the next vote to whichever server has the lower response time. If both are equal, fall back to round-robin."

*(This is intentionally rule-based, not a trained ML model — sufficient for demo purposes and far more reliable to build in your timeframe. If your team wants to genuinely use a logistic regression model, that becomes a separate, isolated prompt using Python/scikit-learn as a microservice — only attempt this after everything else is stable.)*

---

## Phase 5 — Anomaly Detection

**Prompt 5.1:**
> "Add logic to the load balancer's health-check function: calculate a rolling average response time per server over the last 10 health checks. If the current response time exceeds this average by more than 50%, or if 3 consecutive heartbeats are missed, mark that server's status as 'down' in the ServerHealth table instead of 'healthy'. Make sure the routing function (from Phase 4) skips any server marked 'down'."

**Checkpoint:** Manually stop Server 2 (Ctrl+C the process) and confirm the load balancer detects this within a few seconds and routes all traffic to Server 3 only. This is your core failover proof — test it repeatedly until reliable.

---

## Phase 6 — Anti-Fraud Layer

Build these one at a time, testing each before adding the next.

**Prompt 6.1 (Tokens):**
> "Add a GET /start-vote endpoint to the load balancer that generates a UUID token, stores it in the VoteTokens table with an expiry of current time + 3 minutes, and redirects to /vote?token=<uuid>."

**Prompt 6.2 (Token validation):**
> "Add middleware that runs before any vote-related route: check the token query parameter exists in VoteTokens, is not expired, and is not marked used. If the claimed_device_fingerprint field is empty, save the incoming request's fingerprint there. If it's already set, confirm it matches the current request's fingerprint before allowing the request through."

**Prompt 6.3 (Fingerprint capture, frontend):**
> "In the React frontend, integrate FingerprintJS to generate a device fingerprint on page load. Send this fingerprint as a header (X-Device-Fingerprint) on every API request to the backend."

**Prompt 6.4 (Cookie check):**
> "On successful vote submission, set a cookie named 'trustpoll_voted' with a 24-hour expiry. On the identity form page, check for this cookie client-side before allowing form submission — if present, show 'You've already voted' instead of the form."

**Prompt 6.5 (Identity duplicate check):**
> "Add a POST /api/register-voter endpoint. Before creating a new Voters row, check if a row already exists with the same voter_type and identifier. If it exists and has_voted is true, return an error 'Already voted'. Otherwise proceed."

**Checkpoint:** Test the full anti-fraud chain manually — try voting twice with the same identity, same device, and an expired token — confirm each is blocked correctly.

---

## Phase 7 — Frontend: Voter-Facing Screens

Build screens in this order, one prompt each, referencing the Frontend Guidelines document for styling rules:

**Prompt 7.1:**
> "Build a React component for the Identity Selection screen — three large buttons: Guest, Faculty, Student. On click, navigate to the corresponding form. Use Tailwind CSS, mobile-first, large tap targets per our frontend guidelines."

**Prompt 7.2:**
> "Build a reusable IdentityForm component that accepts a 'variant' prop (guest/faculty/student) and renders the correct fields per variant, as specified in the Backend Schema document. On submit, POST to /api/register-voter."

**Prompt 7.3:**
> "Build the Project Selection screen — a searchable dropdown populated from GET /api/projects, plus a Submit Vote button that POSTs to /api/vote. Handle the empty-projects-list state gracefully with a placeholder message."

**Prompt 7.4:**
> "Build the Confirmation screen showing 'Vote recorded successfully' and the handled_by_server value returned from the vote API response."

---

## Phase 8 — Frontend: Dashboard

**Prompt 8.1:**
> "Build a Dashboard page that polls GET /api/dashboard-summary every 2 seconds and displays: total vote count, a bar chart of votes per project (using Recharts), and two status boxes for Server 1 and Server 2 showing green/red based on health status."

**Prompt 8.2:**
> "Add a live-updating log panel to the dashboard showing the last 10 votes with format: 'Vote → [Project Name] → Server X (response_time_ms)'."

**Prompt 8.3 (Chatbot):**
> "Add a simple chatbot input box to the dashboard. On submit, POST the question to /api/chatbot-query. Build the backend endpoint to match simple keyword patterns (e.g., 'health', 'status', 'how many votes') and return a templated plain-English response using current ServerHealth and Votes data."

---

## Phase 9 — Predictive Auto-Scaling (Optional, Only If Time Permits)

**Prompt 9.1:**
> "Add logic to the load balancer that tracks votes-per-10-seconds over a rolling window. If the rate increases by more than 3x compared to the previous window, log 'Spike predicted' and (if a 4th standby server URL is configured) add it to the active routing pool."

*(Treat this as a stretch goal — per the PRD, this can remain a verbal talking point if time runs short.)*

---

## Phase 10 — Networking & Deployment

Do this last, only once the app fully works on localhost:

1. Set up local WiFi router; connect Device 1 via LAN, Device 2 & 3 via WiFi
2. Confirm all 3 devices can reach each other using local IPs
3. Install `cloudflared` on Device 1
4. Run `cloudflared tunnel --url http://localhost:PORT` to get a public HTTPS URL
5. Generate the QR code pointing to this tunnel URL's `/start-vote` endpoint
6. Test the entire flow end-to-end from a phone on mobile data (not on your WiFi) to confirm the tunnel works correctly

---

## General Rules for Working With the AI Coding Agent (Token-Limit Management)

- **One phase, one context window.** Don't reference earlier phases' full code in later prompts — just describe what already exists briefly ("There's already a Voters table with these fields...") and let the agent regenerate only what's needed for the current task.
- **Always test before moving to the next prompt.** Catching a bug in a 20-line addition is fast; catching it after 5 stacked features is slow and confusing for both you and the agent.
- **If a prompt fails or produces confusing code, narrow it further.** Instead of "fix the load balancer," say "the POST /api/vote endpoint is returning 500 errors when project_id is missing — add validation to return a 400 error with a clear message instead."
- **Keep each prompt focused on ONE file or ONE feature.** Avoid "also while you're at it..." additions — log those as a separate next prompt instead.
