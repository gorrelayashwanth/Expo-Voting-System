# Web Flow Document
### Project: TrustPoll

This document maps every screen and decision point a user (voter) and the system pass through, end to end.

---

## 1. Voter-Facing Flow (Primary Journey)

```
┌─────────────────────┐
│  1. Scan QR Code      │  (Physical QR displayed at booth/dashboard screen)
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│  2. Token Generated   │  Server creates time-limited token (~3 min expiry),
│     & Redirect        │  binds to first device that opens it
└──────────┬───────────┘
           ▼
┌─────────────────────┐
│  3. Landing / Loading │  Brief loading state while token + device
│                        │  fingerprint are validated
└──────────┬───────────┘
           ▼
      ┌────┴────┐
      │ Token    │──NO──► Show error: "Link expired or invalid, please scan again"
      │ valid?   │        (dead end, must rescan QR)
      └────┬─────┘
          YES
           ▼
┌─────────────────────┐
│  4. Identity Selection│  User picks: Guest / Faculty / Student
└──────────┬───────────┘
           ▼
   ┌───────┴────────┐
   ▼                ▼                ▼
┌────────┐    ┌──────────┐    ┌───────────┐
│ Guest   │    │ Faculty   │    │ Student    │
│ Form    │    │ Form      │    │ Form       │
│         │    │           │    │            │
│ Name    │    │ Name      │    │ Name       │
│ Org/    │    │ Dept      │    │ Year       │
│ Business│    │           │    │ Dept       │
│ Position│    │           │    │            │
└────┬────┘    └─────┬─────┘    └─────┬──────┘
     └───────────────┼─────────────────┘
                      ▼
         ┌────────────────────────┐
         │ 5. Duplicate Check       │
         │  (identity + fingerprint │
         │   + cookie check)        │
         └────────────┬────────────┘
                       ▼
                 ┌─────┴─────┐
                 │ Already    │──YES──► Show message: "You've already voted"
                 │ voted?     │         (dead end)
                 └─────┬──────┘
                       NO
                       ▼
         ┌────────────────────────┐
         │ 6. Project Selection     │  Dropdown list: Project No. + Title
         │    (single select only)  │  (populated from dataset; empty state
         │                           │   handled gracefully if not yet loaded)
         └────────────┬────────────┘
                       ▼
         ┌────────────────────────┐
         │ 7. Submit Vote           │
         └────────────┬────────────┘
                       ▼
         ┌────────────────────────┐
         │ 8. Request → Load        │  (see System Flow below)
         │    Balancer → Server      │
         │    1 or 2 → Database      │
         └────────────┬────────────┘
                       ▼
                 ┌─────┴─────┐
                 │ Success?   │──NO───► Show error, allow retry
                 └─────┬──────┘         (token still valid within window)
                      YES
                       ▼
         ┌────────────────────────┐
         │ 9. Confirmation Screen   │  "Vote recorded successfully ✅"
         │    "Handled by Server X" │  Token marked as used — link now dead
         └────────────────────────┘
```

---

## 2. System-Side Flow (What Happens Behind the Scenes Per Vote)

```
Vote Submission
      │
      ▼
Device 1 (Load Balancer)
      │
      ├─► AI Smart Routing checks: Server 2 vs Server 3 health/response time
      │
      ▼
Chosen Server (Device 2 or Device 3)
      │
      ├─► Validate vote payload
      ├─► Re-check duplicate (server-side final check)
      ├─► Write to Shared Database
      │
      ▼
Response sent back → Device 1 → Voter's browser
      │
      ▼
Dashboard (Device 1 display) queries database
      │
      └─► Updates: vote count, bar chart, server log, health status
```

---

## 3. Dashboard Flow (Judge/Organizer-Facing, Parallel Screen)

```
┌──────────────────────────┐
│  Live Dashboard (Device 1) │
├──────────────────────────┤
│ - Total Votes counter       │
│ - Bar chart per project     │
│ - Live log: "Vote → Server 2 (41ms)"
│ - Server health (green/red) │
│ - Chatbot input box         │
└──────────────────────────┘
           │
           ▼
   Judge types question
   ("How's the system doing?")
           │
           ▼
   Chatbot reads current DB/health
   state → responds in plain English
```

---

## 4. Failure/Recovery Flow (Demo Moment)

```
Device 2 unplugged/stopped
      │
      ▼
Anomaly Detection (Device 1) misses heartbeat
      │
      ▼
Dashboard flags Server 2 as "Down" (red)
      │
      ▼
Load Balancer excludes Server 2 from routing pool
      │
      ▼
All new votes → routed to Server 3 only
      │
      ▼
Voter experience: unaffected, still gets "Vote recorded ✅"
      │
      ▼
Device 2 reconnected
      │
      ▼
Heartbeat resumes → Dashboard flags Server 2 "Healthy" (green)
      │
      ▼
Load Balancer resumes routing to both servers
```

---

## 5. Predictive Auto-Scaling Flow (Simulated, Optional Feature)

```
Votes-per-minute rate monitored continuously
      │
      ▼
Rate of increase exceeds trend threshold
      │
      ▼
Dashboard shows: "⚡ Spike predicted — activating Server 4"
      │
      ▼
Standby Device 4 added to active routing pool
      │
      ▼
(Once traffic normalizes) Device 4 can be marked standby again
```
