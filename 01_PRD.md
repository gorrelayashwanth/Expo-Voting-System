# Product Requirements Document (PRD)
### Project: TrustPoll — AI-Powered Clustered Voting System for Network Expo

---

## 1. Overview

TrustPoll is a live voting application built to demonstrate **server clustering, AI-powered load balancing, and fault tolerance** at our college's Network Expo. Attendees (students, faculty, guests) vote for their favorite project via QR code. Votes are distributed across two application servers by an AI-assisted load balancer, with real-time dashboards showing system health and vote counts.

The project serves two purposes simultaneously:
1. A functioning voting system for the actual expo event
2. A live technical demonstration of clustering, load balancing, anomaly detection, and fault recovery — the core Network Expo theme

---

## 2. Problem Statement

Standard single-server systems fail under concurrent load and offer no resilience if that server goes down — a real, felt problem during high-traffic moments (exam portals, ticket booking, result declarations). We're building a small-scale, honest demonstration of how clustering solves this, using a real use case (project voting) instead of a purely theoretical one.

Additionally, standard voting systems are vulnerable to ballot manipulation. A secondary goal of this project is demonstrating a **layered anti-fraud system** that prevents duplicate/fake voting without requiring heavyweight authentication (logins/passwords).

---

## 3. Goals

- Demonstrate a working 2-server cluster with 1 AI-powered load balancer
- Prove fault tolerance via live server failure/recovery during demo
- Prevent duplicate/fraudulent voting through layered verification
- Provide a real-time, non-technical-friendly dashboard (including an AI chatbot) showing system status
- Keep vote submission fast and frictionless (QR scan → vote → confirmation, under 30 seconds total)

## 4. Non-Goals (Explicitly Out of Scope)

- Real cloud-based auto-scaling (simulated/conceptual only — see Implementation Plan)
- Full production-grade security (this is a demo-level system, not bank-grade)
- User accounts/login system (identity is verified per-vote, not via persistent accounts)
- Support for traffic beyond expo-day scale (not built for internet-wide viral traffic)

---

## 5. Target Users / Personas

| Persona | Description | Needs |
|---|---|---|
| **Student Voter** | Currently enrolled student attending the expo | Fast, simple voting; wants to vote for their favorite project once |
| **Faculty Voter** | Department faculty attending as judges/visitors | Fast voting; may also be evaluating projects technically |
| **Guest Voter** | External visitors (other colleges, parents, industry guests) | Simple voting without needing college-specific info |
| **Judges (Evaluators)** | Evaluating the TrustPoll project itself as an expo entry | Wants to see live proof of clustering, failure recovery, and AI features working |
| **Team (Developers)** | Building and operating the system on demo day | Needs a reliable, monitorable, low-maintenance system during the live event |

---

## 6. Core Features (Functional Requirements)

### 6.1 Voting Flow
- QR-code-based entry point (time-limited token generation per scan)
- Identity capture screen: Guest / Faculty / Student, each with relevant fields
- Duplicate-vote check against database before allowing vote submission
- Project selection (dropdown, populated from expo dataset)
- Single vote per verified identity, enforced at database level
- Vote confirmation shown to user after successful submission

### 6.2 Anti-Fraud System
- Time-limited token per QR scan (expires after ~3 minutes)
- Device fingerprint binding (one vote per device)
- Cookie-based repeat-vote blocking
- Identity-based duplicate check (roll number / employee ID / name+phone)
- Database-level uniqueness constraint as final safety net

### 6.3 Clustering & Load Balancing
- One load balancer (Device 1) receiving all vote traffic
- Two application servers (Device 2, Device 3) processing and storing votes
- Shared database accessible by both servers
- AI-assisted routing decision (based on response time / load, not pure round-robin)

### 6.4 AI Features
- **Smart Load Balancing** — routes votes based on real-time server health/response time
- **Anomaly Detection** — flags a server as degrading before it fully fails
- **Chatbot Dashboard Assistant** — answers plain-English questions about system status
- **Predictive Auto-Scaling (simulated)** — detects traffic spike trend and activates a standby server in advance

### 6.5 Live Dashboard (Device 1 display)
- Total votes counter
- Per-project vote breakdown (live bar chart)
- Which server handled each vote (live log)
- Server health status (green/red indicators)
- AI chatbot query box

---

## 7. Success Metrics (For Our Own Evaluation)

- Zero duplicate votes recorded during live demo
- Successful failover demonstration (server unplugged → no vote loss → auto-recovery)
- Dashboard updates within 1-2 seconds of a vote being cast
- At least 1 judge/faculty member successfully interacts with the chatbot live
- No system crash/full outage during the demo window

---

## 8. Constraints

- Only 3 physical devices (+ 1 optional standby for auto-scaling simulation) available
- Limited build time (before expo month-end)
- No dedicated cloud budget — using free-tier tunneling (Cloudflare Tunnel) instead of full cloud deployment
- Team is student-built — must favor buildable simplicity over theoretical completeness

---

## 9. Assumptions

- Expo venue will have a stable WiFi network reachable by our 3 devices
- Cloudflare Tunnel will provide reliable public access to Device 1
- Project dataset (list of projects to vote for) will be provided by department before demo day — until received, this is treated as empty/placeholder data
- Judges will be willing to participate directly (scanning QR, voting, asking chatbot questions)

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Venue WiFi has client isolation (devices can't reach each other) | Bring personal WiFi router as backup |
| Cloudflare Tunnel connectivity issue on demo day | Test thoroughly beforehand; have local WiFi fallback |
| Fake votes via shared link | Time-limited tokens + fingerprint + identity + database checks |
| Live "unplug" demo doesn't trigger visibly in time | Rehearse timing multiple times before demo day |
| Dataset of projects not received in time | Dropdown built to handle empty state gracefully, populate last-minute |
