# FairSeat — Frontend Implementation Plan

| | |
|---|---|
| **Status** | Draft v0.2. Awaiting review. Not approved. |
| **Scope** | **Frontend only.** The React application. |
| **Sources of truth** | `intent.md` (approved), `spec.md` v1.1 (approved 2026-10-23) |
| **External standard** | Shared UI component library and `skill.md`, used by all teams. **Not yet available** (§3). |
| **Team** | Three people: two backend engineers (backend work is planned separately and is not covered here) and one frontend and product engineer (owner of this plan). |
| **Duration** | One week (I§5) |

### How to read this plan

| Tag | Meaning |
|---|---|
| `IA-n` | **Interface agreement** the frontend needs from the backend team. Needs agreement from both sides (§8.1). |
| `TD-n` | **Frontend technical decision** proposed by this plan. Needs approval (§8.2). |
| `PA-n` | Planning assumption. If it turns out to be wrong, the plan changes (§9). |
| `F-nn` | Frontend task (§5). |
| `FR`, `NFR`, `AC`, `EC`, `D`, `PD` | References to `spec.md`. |

This plan adds no features and changes no approved requirement. Business rules (capacity, waitlist, allocation, deadlines) are enforced by the backend (NFR-03). The frontend shows the server's outcome and never decides it.

---

## 1. Frontend Scope

### 1.1 What the Frontend Delivers

A responsive React web application (I§1, NFR-07) that covers:

| Area | Spec coverage |
|---|---|
| Public discovery: listing, search, filters, pagination, event details with availability | FR-010–017 |
| Accounts: register, log in, log out, session-expiry handling | FR-001–005 |
| Attendee actions: book, cancel, leave waitlist, accept or decline an offer | FR-020–036 |
| My bookings: Current and Past groups, statuses, waitlist position, offer deadline, valid actions | FR-090–092 |
| Notifications: list, unread count, mark one or all read | FR-080–082 |
| Organizer event management: drafts, publish, edit, capacity, reschedule, cancel | FR-050–064, D-9 |
| Organizer dashboard: counts, registrant lists, attendance marking and correction | FR-070–073, D-8 |
| Error display for every error code in spec §9.1 | §9 of the spec |

### 1.2 What It Doesn't Do

- **It doesn't enforce business rules.** Capacity, FIFO order, deadlines, the final window and error order are all decided by the backend. The UI may validate form fields early for convenience, but the server's answer is final.
- **It doesn't update in real time** (spec A-1). Data refreshes when a page loads and after every user action.
- **No email features** (D-6), and none of the spec's non-goals (spec §2.2).

---

## 2. Proposed Frontend Architecture

### 2.1 Overview

```
 ┌────────────────────────────── React SPA ───────────────────────────────┐
 │ Pages (routes)      public · attendee · organizer                       │
 │ Feature components  EventCard, AvailabilityBadge, RegistrationActions…  │
 │ UI layer  src/ui    adapter over the shared component library (§3)      │
 │ Data layer          RTK Query API slice · generated types · CSRF ·      │
 │                     error envelope · cache refresh after actions        │
 │ Cross-cutting       WAT time formatting · error-code messages ·         │
 │                     status labels · route guards                        │
 └─────────────────────────────────┬───────────────────────────────────────┘
                                   │ JSON over /api/v1 (IA-1), session cookie (IA-3)
                                   ▼
                         Backend (separate plan)
```

### 2.2 Screens

| ID | Screen | Who | Main FRs |
|---|---|---|---|
| S-01 | Event listing (search, category and city filters, pagination) | Everyone | FR-010–013 |
| S-02 | Event details (availability state, own registration and its actions, Book button) | Everyone | FR-014–017, FR-020–036 |
| S-03 | Register | Visitor | FR-001–002 |
| S-04 | Log in (returns the user to where they started) | Visitor | FR-003, W-1 |
| S-05 | My bookings (Current and Past) | Logged-in user | FR-090–092 |
| S-06 | Notifications | Logged-in user | FR-081–082 |
| S-07 | Organizer: my events (drafts, published, cancelled, past) | Organizer | FR-058 |
| S-08 | Organizer: event form (create or edit a draft, publish, edit a published event, cancel) | Organizer | FR-050–056, FR-059–064 |
| S-09 | Organizer: event dashboard (counts, confirmed list, waitlist, pending offers, attendance) | Organizer | FR-070–073 |
| — | App shell: navigation by role, unread badge, logout, not-found page | All | FR-081 |

### 2.3 Registration Status Display (FR-091, FR-017)

This is the single place that decides how each status looks and which actions appear. **Which actions are allowed comes from the server** (IA-6). The table describes the expected result, so the UI can be tested against it, and is not rule logic the UI duplicates.

| Status | Label shown | Extra information | Actions (only while booking is open) |
|---|---|---|---|
| `CONFIRMED` | Confirmed | — | Cancel booking |
| `WAITLISTED` | Waitlisted | Position, plus "not a guarantee of a seat" (FR-031) | Leave waitlist |
| `OFFER_PENDING` | Seat offered | Deadline in WAT (FR-036) | Accept, Decline |
| `CANCELLED` | Cancelled by you | — | None. Can book again from S-02 (FR-025). |
| `LEFT_WAITLIST` | Left waitlist | — | None. Can book again from S-02. |
| `OFFER_DECLINED` | Offer declined | — | None. Can book again from S-02. |
| `OFFER_EXPIRED` | Offer expired | — | None. Can book again from S-02. |
| `WAITLIST_CLOSED` | Waitlist closed | — | None |
| `VOIDED` | Event cancelled | Cancellation reason, if any (PD-13) | None |
| `ATTENDED` | Attended | — | None |
| `NO_SHOW` | No-show | — | None |

Every status is shown as **text**, never by color alone (NFR-08).

### 2.4 Code Organization

The exact folder structure follows `skill.md` once it arrives (F-08). Until then:

- `src/api/` — the API slice, generated types, CSRF handling and error-envelope parsing. This is the only place that calls the backend.
- `src/ui/` — **the adapter layer.** Every basic component (button, input, card, dialog, badge, layout) is imported from here, never directly from a library. When the shared library arrives, only this folder changes (§3).
- `src/features/<area>/` — discovery, auth, bookings, notifications, organizer.
- `src/lib/` — WAT time helper, error-code messages, status labels.
- `src/mocks/` — MSW handlers and fixtures generated from the contract.

---

## 3. Shared Component Library and `skill.md`

All teams must follow a shared UI component library and its `skill.md`. **Neither is available yet.**

| Topic | Approach |
|---|---|
| Before they arrive | Build screens against the `src/ui/` adapter, using minimal local components with props deliberately kept simple and generic. Avoid polishing their look, since it will be replaced. |
| When they arrive | **F-08:** read `skill.md`; list every point where it differs from this plan; swap the adapter's internals to the shared components; apply its conventions (structure, naming, styling, accessibility rules). |
| FairSeat-specific components | `AvailabilityBadge`, `RegistrationStatus`, `WaitlistPosition`, `OfferDeadline`, `RegistrationActions`, `EventSummaryCounts` and `AttendanceControl` are built *on top of* the shared components, not added to the shared library, unless `skill.md` says otherwise. |
| If they conflict with the spec | **The spec wins for behavior; `skill.md` wins for conventions.** For example, if a shared badge shows status by color only, FairSeat adds a text label to meet NFR-08. Any real conflict is raised with the product owner, not decided silently. |
| If they conflict with this plan | `skill.md` wins. The affected TD (§8.2) is updated, for example the data layer or test tools. |
| Deadline | If they arrive after **Day 3**, the swap may not fit in the week. See R-1 for the fallback. |

---

## 4. Technical Approach and Key Frontend Decisions

### 4.1 Data Layer (TD-2, IA-1, IA-2, IA-6)

- **RTK Query** for all server data. It handles caching, loading and error states, and cache invalidation in one place.
- **Refresh after every action.** Each booking, cancel, leave, accept, decline, publish, edit, cancel-event or attendance action invalidates the affected event, My bookings, notification count and dashboard data, so the next render shows the server's state (spec A-1).
- **Types are generated** from `contracts/openapi.yaml` (TD-6). A type check in CI fails when the contract and the code disagree.
- **Server-decided display data (IA-6):** the UI shows `availability.state`, `allowedActions`, `waitlistPosition` and `effectiveOfferDeadline` exactly as returned. It never recalculates them, because the frontend would drift from the backend's rules.

### 4.2 Authentication in the Browser (IA-3, NFR-05)

- Sessions use the backend's `HttpOnly` cookie. **The frontend never stores tokens or passwords** in `localStorage`, `sessionStorage` or app state.
- The CSRF token from the agreed cookie is sent back in a header on every state-changing request. The API layer handles this.
- On `UNAUTHENTICATED`, including an expired session (AC-41), the app sends the user to S-04 and returns them to the same page after they log in (W-1).
- On logout, the API cache is cleared so no user data stays in memory.
- Organizer routes are hidden from non-organizers. This is a convenience only; the backend enforces access (spec §3.2).

### 4.3 Time Display (BR-20, IA-5)

- **One helper** formats every date and time in `Africa/Lagos`, whatever the device's time zone. Offer deadlines always show date and time, for example "Sat 25 Oct, 14:30 WAT".
- **The event form** takes a date, a start time and an end time in WAT. It sends ISO-8601 values with the `+01:00` offset. The form can show a warning when End isn't after Start, but the server decides (BR-22).

### 4.4 Error Handling (spec §9)

A single map turns error codes into messages and behavior:

| Code | UI behavior |
|---|---|
| `VALIDATION_ERROR` | Show each error next to its field, and a summary at the top of the form |
| `UNAUTHENTICATED` | Send the user to log in, then back (§4.2) |
| `INVALID_CREDENTIALS` | One generic message, never saying which field was wrong (FR-003) |
| `EMAIL_TAKEN` | Message on the email field |
| `FORBIDDEN`, `REGISTRATION_NOT_ALLOWED` | Message explaining the action isn't permitted |
| `EVENT_NOT_FOUND`, `REGISTRATION_NOT_FOUND` | Not-found page or message |
| `EVENT_CANCELLED`, `EVENT_STARTED`, `OFFER_EXPIRED`, `ALREADY_REGISTERED`, `INVALID_STATUS_TRANSITION`, `CAPACITY_BELOW_COMMITTED`, `ATTENDANCE_NOT_ALLOWED` | Specific message, then refresh the data so the screen shows the true state |
| `CONFLICT_RETRY` | "Please try again" with a Retry button |
| Network error or 500 | Generic error with Retry. Never show technical details. |

- **The real outcome is always shown (FS-05).** If a user clicks Book and is put on the waitlist instead, the UI says so and shows their position.
- **Every list has loading, empty and error states.**

### 4.5 Organizer Form Behavior

- **Save draft:** only the title is required (PD-11). **Publish:** the server checks every field (BR-30–38). The form shows each `fieldErrors` entry next to its field (AC-34).
- **Editing a published event:** before saving a change to title, Start, End, venue, city or capacity, the form tells the organizer that active registrants will be notified (FR-060–061). This is explanatory text only. The server decides who is notified.
- **Cancel event:** needs a confirmation step, because it can't be undone (PD-14). It has an optional reason field (PD-13).
- **Cancelled events:** the form opens read-only (D-9).

### 4.6 Security

- No `dangerouslySetInnerHTML`. All user-entered text (titles, descriptions, venues, reasons) is rendered as plain text by React.
- No personal data in console logs or error reports.
- Attendee emails are shown only on S-09, which only the event's owner can load (NFR-06). The UI shows only what the API returns.

---

## 5. Implementation Phases and Tasks

**Conventions:**
- Each task is one or more small pull requests.
- **Done** means: the listed checks pass; CI passes (lint, type check, tests); and every acceptance-checklist item (§6.3) touched by the task has been checked.
- Screens are built **against MSW mocks first**, then switched to the real backend (F-20). Backend delays therefore don't block screen work.

### Phase 0 — Foundations (Day 1)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F-01 | Project setup: Vite, React, TypeScript, React Router, linting, formatting, CI for the frontend | TD-1 | CI runs lint, type check and tests on every pull request |
| F-02 | **Agree the API contract with the backend team.** Review `contracts/openapi.yaml` for every endpoint the frontend uses, covering IA-1 to IA-8. | Backend availability | Both sides have signed off v1 of the contract |
| F-03 | Generate types from the contract. Write MSW handlers and fixtures that include **every availability state and every registration status** in §2.3. | F-02 | The app runs fully on mocks. Fixtures include a full event, a final-window event, a cancelled event and a started event. |
| F-04 | API layer: RTK Query base, CSRF header, cookies sent with requests, error-envelope parsing, cache invalidation tags | F-03 | Unit tests: errors are parsed into `{code, message, fieldErrors}`, and the CSRF header is attached to every state-changing request |
| F-05 | Shared helpers: WAT time formatting, error-code message map (§4.4), status label map (§2.3) | F-01 | Unit tests: WAT output is correct when the test runs in a different time zone; every §9.1 code has a message; every status has a label |
| F-06 | `src/ui/` adapter with minimal temporary components (button, input, select, card, dialog, badge, layout) | F-01 | Screens can be built only from `src/ui/` |

### Phase 1 — Public and Attendee Screens (Days 2–3)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F-10 | App shell: navigation by role, logout, not-found page. S-03 Register, S-04 Log in with return-to-page, and session-expiry redirect. | F-04, F-06 | Checklist items for AC-04, AC-05 and AC-41 pass on mocks. The redirect is covered by a component test. |
| F-11 | S-01 Event listing: search, category and city filters, pagination, empty and error states | F-04, F-05 | AC-01 and AC-02 checklist items pass on mocks. Filters and search can be combined. |
| F-12 | S-02 Event details: all four availability states (FR-015), own registration with its actions, Book with outcome display (confirmed, or waitlisted with position) | F-11 | AC-03, AC-06 and the FS-05 checklist items pass on mocks. Logged-out Book goes to log in and back (W-1). |
| F-13 | S-05 My bookings: Current and Past, status display (§2.3), position with disclaimer, WAT deadline, Cancel, Leave, Accept, Decline, refresh after each action | F-12 | Checklist items for AC-31 and AC-43 pass on mocks. A component test shows the correct actions for every status. |

### Phase 2 — Notifications and Organizer Screens (Days 4–5)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F-14 | Notifications: unread badge in the shell, S-06 list (newest first), mark one or all read, links to the event or booking | F-10 | AC-42 checklist item passes on mocks |
| F-15 | S-07 My events. S-08 Event form: save draft, publish with field errors, edit published (with the notification note), cancel with confirmation and reason, read-only when cancelled. | F-06, F-05 | AC-34 and AC-45 checklist items pass on mocks. Each field error shows next to its field. |
| F-16 | S-09 Organizer dashboard: counts, confirmed list, waitlist in order, pending offers with deadlines, attendance marking and correction (Attended, No-show, back to Confirmed) | F-15 | Checklist items for AC-26, AC-27 and AC-36 pass on mocks. `ATTENDANCE_NOT_ALLOWED` and `FORBIDDEN` messages display correctly. |

### Phase S — Shared Library Adoption (as soon as it arrives)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F-08 | Adopt `skill.md` and the shared component library: list where they differ from this plan; swap `src/ui/` to shared components; apply its conventions; raise any conflict with the spec | Library available | `src/ui/` uses the shared components. Every difference is recorded and resolved. No screen imports a UI library except through `src/ui/`. |

### Phase 3 — Integration, Hardening and Demo (Days 5–7)

| ID | Task | Depends on | Done when |
|---|---|---|---|
| F-20 | Switch to the real backend one area at a time: auth → discovery → bookings → notifications → organizer. Fix any mismatch in the contract first, then in code. | Backend milestones (§7.1) | Each area works against the backend. MSW stays available for tests. |
| F-21 | Responsive and accessibility pass: every screen at 360px and desktop widths; a keyboard-only walkthrough of browse, book, accept or decline, and cancel; statuses shown as text | F-20 | NFR-07 and NFR-08 checklist complete. Defects fixed or logged. |
| F-22 | Fill gaps in component tests: every screen's loading, empty and error states; every availability state; every registration status | F-16 | The tests in §6.2 exist and pass |
| F-23 | Run the UI acceptance checklist (§6.3) on the hosted environment | F-20, backend deployment | Every item is checked or has a logged defect |
| F-24 | Demo script, plus a short pilot feedback plan if a pilot is feasible (I§5, I§16) | F-23 | Demo rehearsed once end to end. The script states that a demo doesn't prove product-market fit (I§5). |

### 5.1 Schedule

| Day | Frontend work | Backend milestone needed (§7.1) |
|---|---|---|
| 1 | F-01, F-02, F-03, F-04, F-05, F-06 | Contract v1 agreed |
| 2 | F-10, F-11 | — |
| 3 | F-12, F-13 | Auth and discovery available in a dev environment |
| 4 | F-14, F-15 | Bookings and My bookings available |
| 5 | F-16; start F-20 (auth, discovery) | Notifications and organizer endpoints available |
| 6 | F-20 (bookings, organizer), F-21, F-22 | Hosted environment with demo data |
| 7 | F-23, F-24. **Afternoon kept free as buffer.** | Backend defects fixed |

**F-08 has no fixed day.** It runs as soon as the shared library arrives, ideally by Day 3.

---

## 6. Testing and Verification Strategy

### 6.1 Who Verifies What

| Concern | Verified by |
|---|---|
| Business rules, the error order, concurrency, deadlines (AC-28, NFR-01–04, NFR-10–11) | **The backend team** (separate plan). The frontend doesn't re-test rules. |
| Correct display of server outcomes, statuses, actions, errors and times | **Frontend**: component tests (§6.2) |
| End-to-end behavior and the on-screen parts of the ACs | **Frontend**: manual UI acceptance checklist (§6.3), run on mocks and then on the hosted environment |
| Contract match | Generated types plus the CI type check (TD-6) |

### 6.2 Automated Frontend Tests

Vitest, React Testing Library and MSW (TD-4). No automated browser tests: AC-28 allows a manual checklist for the on-screen parts.

| Area | What is tested |
|---|---|
| Helpers | WAT formatting under a different system time zone; every error code has a message; every status has a label |
| API layer | Error-envelope parsing; CSRF header on state-changing requests; cache refresh after actions |
| Auth | Redirect on `UNAUTHENTICATED` and return afterwards; logout clears the cache |
| S-01, S-02 | Each availability state renders its label; Book outcome for confirmed and for waitlisted with position |
| S-05 | Each status in §2.3 shows the correct label and actions; position disclaimer shown; deadline shown in WAT |
| S-06 | Unread count updates after mark-read and mark-all-read |
| S-08 | `fieldErrors` shown next to fields; cancel needs confirmation; cancelled events are read-only |
| S-09 | Counts render; each attendance change is sent and the result displayed; attendance errors show their messages |
| All screens | Loading, empty and error states |

### 6.3 UI Acceptance Checklist (`docs/ui-checklist.md`)

These are the parts of each AC the user sees. Each item is run on mocks during development, and again on the hosted environment in F-23.

| AC | Screen | What to check |
|---|---|---|
| AC-01, AC-02 | S-01 | Only upcoming events; soonest first; search combined with filters |
| AC-03 | S-02 | A cancelled event shows "Cancelled" and no Book button |
| AC-04, AC-05, AC-41 | S-03, S-04 | Email-taken message; logged-out booking goes to log in; expired session goes to log in and back |
| AC-06, AC-07 | S-02 | Confirmed outcome shown; an already-registered user sees their status, not a Book button |
| AC-09–14, AC-29–31 | S-05, S-02 | Offer shows its WAT deadline with Accept and Decline; expired offer message; position and disclaimer; leave; book again after decline |
| AC-15, AC-16, AC-33 | S-08, S-09 | Capacity-too-low message; counts after a capacity change |
| AC-17–20 | S-05 | Seat-allocated notice; started event shows booking closed and no actions |
| AC-21–24, AC-37–39, AC-45 | S-08, S-06 | Change notices show old and new values; cancellation notice shows the reason; cancelled event is read-only |
| AC-25–27, AC-36, AC-44, AC-46 | S-09 | Dashboard counts; attendance marking and correction; attendance error messages |
| AC-32 | S-02 | An organizer sees no Book button on their own event, or gets the not-allowed message |
| AC-34, AC-35 | S-08, S-02 | Field errors on publish; another organizer's draft shows not-found |
| AC-40 | S-05, S-02 | Accepting a voided offer shows the event-cancelled message |
| AC-42 | S-06 | Unread count; mark one and mark all |
| AC-43 | S-05 | Current and Past groups; correct actions only |
| NFR-07 | All | Usable at 360px and desktop; no horizontal scrolling |
| NFR-08 | Key flows | Keyboard-only walkthrough; every status shown as text |

AC-08 (concurrent bookings) and AC-28 (backend test coverage) have nothing visible to check. The backend team verifies them.

### 6.4 Frontend NFR Checks

| NFR | Frontend check |
|---|---|
| NFR-05 | Code review and a search: nothing stores passwords or tokens in browser storage |
| NFR-06 | Attendee emails appear only on S-09. Personal data never appears in logs. |
| NFR-07 | Checklist at 360px and desktop widths (F-21) |
| NFR-08 | Keyboard walkthrough and text statuses (F-21) |

---

## 7. Dependencies and Prerequisites

### 7.1 Backend Dependencies

The two backend engineers' work is planned separately. The frontend needs the following from them. The days are proposals to agree with the backend team in F-02.

| ID | Needed from backend | Needed by | Blocks |
|---|---|---|---|
| B-1 | Contract v1 (`contracts/openapi.yaml`) agreed, covering IA-1 to IA-8 | End of Day 1 | F-03 onwards |
| B-2 | A dev environment or local run instructions, with seed organizers | Day 3 | F-20 |
| B-3 | Auth, discovery and event details endpoints | Day 3 | F-20 (auth, discovery) |
| B-4 | Booking actions and My bookings endpoints | Day 4 | F-20 (bookings) |
| B-5 | Notification and organizer endpoints | Day 5 | F-20 (notifications, organizer) |
| B-6 | Hosted environment with demo data: events in the normal period, the final window, full with a waitlist, cancelled, and started | Day 6 | F-23, F-24 |
| B-7 | Contract changes raised before code changes, and announced to the frontend | Ongoing | — |

If a backend milestone slips, the frontend carries on with mocks. Integration of that area moves later, and the change is reported in the daily check-in.

### 7.2 Other Prerequisites

| ID | Prerequisite | Needed by |
|---|---|---|
| P-1 | Approval of this plan, and agreement from the backend team on IA-1 to IA-8 | F-02 |
| P-2 | The shared component library and `skill.md` (§3) | F-08 |
| P-3 | Repository access and CI for the frontend | F-01 |
| P-4 | Organizer names and emails for demo seed data (product decision) | B-6 |

---

## 8. Decisions Needing Approval Before Implementation

### 8.1 Interface Agreements with the Backend Team

These need sign-off from the product owner and the backend team, because the frontend depends on them.

| ID | Agreement | Why the frontend needs it |
|---|---|---|
| IA-1 | REST over JSON under `/api/v1`, contract-first, with `contracts/openapi.yaml` as the single source | Lets screens be built against mocks, with type-checked contract matching |
| IA-2 | Error envelope `{ code, message, fieldErrors[] }`, with the codes exactly as in spec §9.1 | One shared error-handling layer (§4.4) |
| IA-3 | Session cookie (`HttpOnly`), a CSRF token cookie echoed back in a request header, and `UNAUTHENTICATED` on an expired session | Browser auth (§4.2) |
| IA-4 | **Same origin:** the built SPA and the API are served from one domain. In development, Vite proxies `/api`. | Avoids CORS and cross-site cookie problems. If the backend team prefers separate domains, CORS and cookie settings have to be agreed instead. **This needs a decision.** |
| IA-5 | Date-times are ISO-8601 with an offset. The form sends WAT (`+01:00`) values. | Correct time display and entry (§4.3) |
| IA-6 | **The server supplies display data:** event `availability { state, availableSeats, waitlistCount }`; each registration's `allowedActions`, `waitlistPosition` and `effectiveOfferDeadline` | The UI never duplicates business rules (FR-091) |
| IA-7 | Notification types (`BOOKING_CONFIRMED`, `OFFER_ISSUED`, `OFFER_EXPIRED`, `SEAT_ALLOCATED`, `EVENT_CHANGED`, `EVENT_CANCELLED`), each with the event title, a message, old and new values for changes, a link target, and the read state | Notification display (FR-082) |
| IA-8 | Paginated responses take the form `{ items, page, pageSize, totalItems }` | S-01 pagination (FR-013) |

### 8.2 Frontend Technical Decisions

Each of these may be overridden by `skill.md` when it arrives (§3).

| ID | Decision | Recommendation |
|---|---|---|
| TD-1 | Tooling | TypeScript, Vite, React Router |
| TD-2 | Data layer | Redux Toolkit Query |
| TD-3 | UI components | The shared library through the `src/ui/` adapter; minimal temporary components until it arrives |
| TD-4 | Tests | Vitest, React Testing Library, MSW; no automated browser tests (the manual checklist covers the on-screen parts, as AC-28 allows) |
| TD-5 | Forms | Plain controlled forms with server-side validation as the authority, unless `skill.md` names a form library |
| TD-6 | Contract types | Generate TypeScript types from `openapi.yaml`; the CI type check catches drift |

---

## 9. Planning Assumptions

| ID | Assumption |
|---|---|
| PA-1 | "One week" means seven calendar days, with the demo at the end of Day 7. If it means five working days, F-22 is reduced to the most important screens, and the product owner may approve cutting **Should** items only (FR-013 pagination, FR-064 combined notices, FR-073). |
| PA-2 | The shared component library is built for React and works with TypeScript. |
| PA-3 | `skill.md` sets conventions and doesn't change FairSeat's required behavior. If it does, the spec wins (§3). |
| PA-4 | The backend team agrees the interface items in §8.1 on Day 1, or proposes alternatives the same day. |
| PA-5 | There are no live updates. Data refreshes on page load and after each action (spec A-1). |
| PA-6 | The frontend engineer is already comfortable with React and RTK Query. No learning time is planned. |

---

## 10. Risks and Mitigations

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | The shared library or `skill.md` arrives late (after Day 3) or doesn't fit | Medium | High | The `src/ui/` adapter limits a later swap to one folder. If it arrives after Day 5, ship with the temporary components and record the deviation. That needs agreement from whoever owns `skill.md`. |
| R-2 | One person building about 9 screens plus integration in a week | High | High | Contract-first with mocks from Day 1; screens built on mocks while the backend progresses; a daily scope check. Only Should items may be cut, with product-owner approval (PA-1). |
| R-3 | Backend milestones slip | Medium | Medium | Mocks keep screens moving; integration happens one area at a time; slips are reported daily |
| R-4 | Frontend and backend drift apart | Medium | Medium | Generated types; contract changed before code (B-7) |
| R-5 | Times shown in the wrong time zone | Medium | Medium | One WAT helper, tested under a different system time zone |
| R-6 | Users see out-of-date availability (no live updates) | Medium | Low | Refresh after every action; always show the server's actual outcome (FS-05) |
| R-7 | `skill.md` conflicts with the spec, for example status shown by color only | Low | Medium | Spec wins for behavior; conflicts raised with the product owner (§3) |
| R-8 | Organizer screens turn out more complex than estimated (form, dashboard, attendance) | Medium | Medium | Built on Days 4–5 after the patterns are settled on the attendee screens; reuse the same list, form and error components |
| R-9 | The demo is mistaken for proof of product-market fit | Medium | Medium | The demo script says so explicitly (I§5) |

---

## 11. Working Method (AI-Native SDLC)

- **Change control:** `spec.md` v1.1 is the contract. If building the UI exposes a gap or mismatch, stop, raise it, and change the spec (with product-owner approval) before changing behavior.
- **Small pull requests,** each listing its F-task and the AC checklist items it covers.
- **AI-assisted work:** each request to the AI assistant includes the task, the relevant spec sections, this plan's agreements and decisions, and `skill.md` once available. Generated code goes through the same review, type check and tests as hand-written code. The AI is never asked to decide behavior the spec leaves open.
- **Definition of Done:** the task's "Done when" checks pass; CI passes; the relevant checklist items are checked; no screen imports a UI library except through `src/ui/`; no time is formatted except through the WAT helper; no error message is written except in the shared map.