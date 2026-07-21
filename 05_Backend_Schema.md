# Backend Schema Document
### Project: TrustPoll

---

## 1. Database Tables (PostgreSQL, via Prisma)

### 1.1 `Projects`
Stores the list of expo projects being voted on.

| Field | Type | Notes |
|---|---|---|
| id | UUID / Serial | Primary key |
| project_number | Integer | Displayed in dropdown |
| title | String | Project title |
| team_name | String | Optional, for display |
| created_at | Timestamp | Default now |

*(This table remains empty until the department provides the official dataset — frontend must handle empty state gracefully, as previously noted.)*

---

### 1.2 `Voters`
Stores identity records used for duplicate-vote checking. One row per unique identity.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| voter_type | Enum (`guest`, `faculty`, `student`) | Required |
| name | String | Required |
| identifier | String | Roll Number (student) / Employee ID or Dept (faculty) / Phone (guest, optional) — used for duplicate check |
| department | String | Nullable (guest may not have one) |
| year | String | Nullable, student only |
| organisation | String | Nullable, guest only |
| position | String | Nullable, guest only |
| device_fingerprint | String | Captured client-side via FingerprintJS |
| has_voted | Boolean | Default false |
| created_at | Timestamp | Default now |

**Unique constraint:** `(voter_type, identifier)` — prevents the same roll number/employee ID from registering twice.

---

### 1.3 `Votes`
Stores each individual vote cast.

| Field | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| voter_id | UUID (FK → Voters.id) | Who cast this vote |
| project_id | UUID (FK → Projects.id) | Which project received the vote |
| handled_by_server | String | e.g., "Server 1" / "Server 2" — for dashboard display |
| response_time_ms | Integer | Captured at write time, feeds AI/dashboard metrics |
| timestamp | Timestamp | Default now |

**Unique constraint:** `voter_id` (one vote per voter record — enforced at DB level as final safety net)

---

### 1.4 `VoteTokens`
Stores time-limited tokens generated per QR scan.

| Field | Type | Notes |
|---|---|---|
| token | String (UUID) | Primary key |
| created_at | Timestamp | Default now |
| expires_at | Timestamp | created_at + 3 minutes |
| used | Boolean | Default false |
| claimed_device_fingerprint | String | Nullable until first opened — binds token to first device |

---

### 1.5 `ServerHealth`
Tracks live health status of Server 1 and Server 2 for dashboard + AI logic.

| Field | Type | Notes |
|---|---|---|
| server_id | String | "server_1" / "server_2" / "server_4_standby" |
| status | Enum (`healthy`, `warning`, `down`) | Updated via heartbeat |
| last_heartbeat | Timestamp | Updated every 1-2 sec |
| avg_response_time_ms | Float | Rolling average, used by anomaly detection + smart routing |
| active_connections | Integer | Optional, for future load calculations |

---

## 2. API Endpoints (Device 1 — Load Balancer)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/start-vote` | Generates a new token, redirects to `/vote?token=xyz` |
| GET | `/vote?token=xyz` | Validates token (exists, not expired, not used, device binding), returns identity form |
| POST | `/api/register-voter` | Registers voter identity, runs duplicate check |
| GET | `/api/projects` | Returns project list for dropdown |
| POST | `/api/vote` | Receives vote submission, routes to Server 1 or Server 2 via AI logic |
| GET | `/api/dashboard-summary` | Returns live vote counts, server health, logs for dashboard polling |
| POST | `/api/chatbot-query` | Receives chatbot question, returns plain-English status response |
| GET | `/api/health/:server_id` | Internal — used by Device 1 to ping Server 1/2 heartbeat |

## 3. API Endpoints (Device 2 & 3 — App Servers)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/process-vote` | Receives vote forwarded from Load Balancer, validates + writes to DB |
| GET | `/health` | Returns current health/response-time stats for heartbeat check |

---

## 4. Validation Order (Server-Side, Per Vote Submission)

This must be implemented in this exact order for efficiency (cheapest checks first):

1. Token validation (exists, unexpired, unused, device-bound)
2. Cookie check (client-side signal, cross-checked server-side)
3. Device fingerprint check (against `Voters.device_fingerprint`)
4. Identity duplicate check (against `Voters.identifier` unique constraint)
5. Database-level constraint (final enforcement, catches any race conditions)

---

## 5. Data NOT to Expose Publicly (Dashboard/Frontend)

- `device_fingerprint` values — internal use only, never rendered on any screen
- Raw IP addresses — logged internally if needed for rate-limiting, never displayed
- Full `VoteTokens` table contents — tokens should never be visible/listable anywhere in the UI
- Internal server error stack traces — dashboard should only ever show clean status messages (e.g., "Server 2 unresponsive"), never raw error output
