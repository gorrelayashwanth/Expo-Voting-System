# Frontend & Guidelines Document
### Project: TrustPoll

---

## 1. High-Level Performance Objectives

These are the architectural goals every frontend screen must meet:

- **Optimized Core Web Vitals** — prioritize fast load times and visual stability on real devices (voters' phones, often mid-range Android)
- **Sub-100ms Interaction Latency** — every button tap, dropdown open, or toggle must feel instant, no visible delay
- **Minimal Time to Interactive (TTI)** — the page must be fully clickable/usable almost immediately after it visually appears, not just "painted"
- **Zero-Lag Layout Shifts** — no elements jumping around as data loads (e.g., dropdown options popping in late shifting the layout) — reserve space/use skeleton loaders instead

**Practical implications of these goals:**
- Keep bundle size small — avoid unnecessary heavy libraries on the voter-facing pages
- Lazy-load the dashboard's charting library separately from the voter form (they're different audiences, no need to load chart code on a voter's phone)
- Use skeleton loaders (not blank space) while the project dropdown list loads
- Avoid animations/transitions heavier than ~200ms — snappy, not decorative

---

## 2. Screens to Build (Voter-Facing)

1. **Landing/Loading** — shown briefly while token validates
2. **Identity Selection** — Guest / Faculty / Student choice
3. **Identity Form** (3 variants — see field list below)
4. **Project Selection** — searchable dropdown
5. **Confirmation Screen** — success state

## 3. Screens to Build (Dashboard-Facing, Device 1 Display)

1. **Live Dashboard** — vote counts, server health, live log
2. **Chatbot Panel** — embedded within dashboard, not a separate page

---

## 4. Form Field Specifications

**Guest:**
- Name (text, required)
- Organisation/Business Name (text, optional)
- Position/Designation (text, optional)

**Faculty:**
- Name (text, required)
- Department (dropdown, required)

**Student:**
- Name (text, required)
- Year (dropdown: 1st/2nd/3rd/4th, required)
- Department (dropdown, required)

*(Roll Number should also be captured for students as the primary duplicate-check identifier — confirm final field list with team before backend schema lock.)*

---

## 5. Design Guidelines

### 5.1 Visual Tone
- Clean, modern, minimal — this is a technical demo, not a consumer brand; avoid overly playful/cartoonish styling
- Use a consistent accent color to represent "your project" branding (e.g., a blue or teal) — apply consistently across voter form and dashboard for visual cohesion

### 5.2 Typography
- One clear sans-serif font family throughout (e.g., Inter, system-ui stack) — avoid mixing multiple fonts
- Large, legible text on the voter form (this will be used on phones, often quickly, sometimes in a crowded/noisy environment)

### 5.3 Layout Principles
- **Voter forms:** single-column, mobile-first — most voters will use phones, not laptops
- **Dashboard:** wide-screen layout, optimized for a laptop/monitor facing the audience, larger fonts/numbers so it's readable from a distance
- **Buttons:** large tap targets (minimum ~44px height) — critical for quick phone interaction in a crowd

### 5.4 Feedback States
- Every action needs immediate visual feedback: button press states, loading spinners during submission, clear success/error messaging
- Error messages must be in plain language (e.g., "This link has expired, please scan again" — not raw error codes)

### 5.5 Accessibility Basics
- Sufficient color contrast (especially for the red/green server health indicators — don't rely on color alone, add text labels too, since color-blind judges/voters should still understand status)
- Form inputs must have visible labels, not just placeholder text (placeholder-only fields are a common mobile UX mistake — text disappears once typing starts, confusing users)

---

## 6. Dashboard-Specific Guidelines

- **Real-time feel:** updates should visibly animate in (e.g., new log line sliding in, bar chart growing) rather than abruptly jumping — reinforces the "live" feeling for judges watching
- **Server health indicators:** large, unmistakable green/red status blocks — should be readable from across a room
- **Chatbot placement:** fixed position, easily visible, doesn't require scrolling to find during a live demo

---

## 7. Component Reuse Strategy

To move fast, build these as reusable components from the start:
- `<IdentityForm variant="guest|faculty|student" />` — one component, conditional fields, instead of 3 separate hardcoded forms
- `<StatusBadge status="healthy|down|warning" />` — reused across dashboard server boxes
- `<Toast />` — for all success/error messaging across the app, consistent style

---

## 8. What NOT to Over-Engineer

Given the timeline, deliberately keep these simple:
- No complex animation libraries (Framer Motion, etc.) — CSS transitions are sufficient
- No multi-language support needed for this build
- No dark mode toggle — pick one theme and commit
- No user account/login UI — identity is per-vote, not persistent
