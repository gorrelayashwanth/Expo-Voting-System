# Tech Stack Document
### Project: TrustPoll

This document specifies exact technology choices per component, with reasoning, so the team builds consistently without guessing.

---

## 1. Overview Table

| Layer | Technology | Reason |
|---|---|---|
| Frontend (Voting UI) | React (Vite) + Tailwind CSS | Fast to build, component reuse across Guest/Faculty/Student forms, team likely already familiar |
| Frontend (Dashboard) | React + Chart library (Recharts or Chart.js) | Live bar charts, real-time updates via polling/websockets |
| Backend (Servers 1 & 2 / Devices 2 & 3) | Node.js + Express | Lightweight, fast to set up, easy JSON handling, team familiarity |
| Load Balancer (Device 1) | Node.js + Express + `http-proxy-middleware` (or lightweight custom router) | Full control to inject AI routing logic, easier than configuring Nginx for custom AI-based rules |
| Database | PostgreSQL (or MongoDB if team prefers NoSQL) | Structured relational data (votes, identities) fits PostgreSQL well; use Prisma ORM if team has prior experience (mentioned in past projects) |
| Device Fingerprinting | FingerprintJS (open-source library) | Free, well-documented, generates a stable device ID client-side |
| Token Generation | `crypto.randomUUID()` (built into Node.js) + timestamp expiry check | No external dependency needed |
| AI — Smart Load Balancing | Simple Logistic Regression (Python via `scikit-learn`, exposed as a small Flask microservice) OR rule-based JS logic if time-constrained | Matches team's ML coursework; rule-based fallback if time runs short |
| AI — Anomaly Detection | Threshold + moving-average logic in Node.js (no heavy ML needed) | Simpler, reliable, avoids live-demo unpredictability |
| AI — Chatbot | Template-based response engine (if-else / rule matching on DB state) OR lightweight LLM call (if API access + time available) | Rule-based is safer for demo reliability |
| AI — Predictive Auto-Scaling | Simple trend-detection rule (rate-of-change threshold) in Node.js | Simulated, not real ML — documented in Implementation Plan |
| Networking (Local) | WiFi Router connecting Device 1 (via LAN cable) + Device 2 & 3 (via WiFi) | Matches available hardware (1 LAN cable) |
| Public Access | Cloudflare Tunnel | Free, reliable, gives Device 1 a public HTTPS URL without exposing local network directly |
| QR Code Generation | `qrcode` npm package | Simple, generates QR from any URL/token string |
| Hosting of Static Frontend | Served directly from Device 1's Express server (or Device 2/3) | Keeps everything self-contained, no external hosting dependency |

---

## 2. Frontend Details

- **Framework:** React (via Vite for fast dev builds)
- **Styling:** Tailwind CSS — utility classes speed up building 3 different identity forms + dashboard quickly
- **State Management:** React's built-in `useState`/`useEffect` — no need for Redux at this scale
- **Real-time Dashboard Updates:** Start with simple polling (fetch every 1-2 seconds) — upgrade to WebSockets only if time allows and team is comfortable
- **Charts:** Recharts (simplest React-native charting library, good documentation)
- **Fonts/Icons:** System fonts + Lucide icons (free, clean, matches modern UI expectations)

---

## 3. Backend Details

- **Framework:** Express.js on all 3 devices (Load Balancer + Server 1 + Server 2) — keeping the same framework across all devices reduces context-switching for the team
- **API Style:** REST (JSON over HTTP) — simplest, most universally understood, no need for GraphQL complexity here
- **Environment Config:** `.env` files per device (SERVER_ID, DB connection string, PORT)
- **Process Management:** `nodemon` for development; plain `node server.js` for demo day (avoid unnecessary complexity like PM2 unless team is already comfortable with it)

---

## 4. Database Details

**Recommended: PostgreSQL**

Reasoning: structured, relational data (votes tied to identities, identities tied to projects) fits PostgreSQL's strengths, and the team has prior experience with PostgreSQL + Prisma (per past project work).

- **ORM:** Prisma (team familiarity, type-safe queries, easy migrations)
- **Hosting:** Run PostgreSQL locally on Device 1 (or Device 2) — no cloud DB needed since everything must be demo-able offline/on-tunnel

*(Alternative: MongoDB + Mongoose if the team prefers document-based storage — either works fine at this scale; pick whichever the team already knows best to save build time.)*

---

## 5. AI/ML Component Details

| Component | Approach | Complexity |
|---|---|---|
| Smart Load Balancing | Logistic regression predicting "will this server be overloaded in next X seconds" based on recent response time + request count | Medium — can fallback to simple weighted rule if time-constrained |
| Anomaly Detection | Moving average of response times; flag if current response time > (average + threshold) | Low — pure JS logic, no ML library needed |
| Chatbot | Rule-based responses reading live DB/health state, templated into natural sentences | Low — avoids unpredictable LLM output during live demo |
| Predictive Auto-Scaling | Rate-of-change detection on votes-per-minute | Low — simple trend math, no training required |

**Note:** Keeping AI logic simple and rule-based where possible is intentional — live demos reward reliability over sophistication. A working simple system beats an impressive but flaky one.

---

## 6. Networking & Deployment Tools

- **Cloudflare Tunnel** (`cloudflared`) — exposes Device 1 to the public internet without needing port forwarding or a static IP
- **QR Code Generator:** `qrcode` npm package generates both the Voting QR and (if needed) WiFi-join QR
- **Local Network:** Standard WiFi router; Device 1 wired via Ethernet, Device 2 & 3 on WiFi

---

## 7. Dev Tools

- **Version Control:** Git + GitHub (shared team repo, feature branches per module)
- **API Testing:** Postman or Thunder Client (VS Code extension)
- **Code Editor:** VS Code (team standard)
