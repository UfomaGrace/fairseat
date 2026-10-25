# FairSeat — Specification

| | |
|---|---|
| **Status** | **v1.1 — Approved** by the product owner on 2026-10-23. Changes from here on need a new version and re-approval. |
| **Source of truth** | `intent.md` (approved) |
| **Date** | 2026-10-23 |

**Changes from v1.0 to v1.1 (errata):** Three error-code ambiguities resolved (D-8 to D-10): attendance failures always return `ATTENDANCE_NOT_ALLOWED`; cancelled events are read-only and reject changes with `EVENT_CANCELLED`; attendance on another organizer's registration returns `FORBIDDEN`. Updated FR-053, FR-057, FR-072, §6.5, §9.1, §9.3. Added EC-22 to EC-24 and AC-44 to AC-46. No behavior outside these error paths changed.

**Changes from v0.1 to v1.0:** All proposed decisions approved; OQ-1 to OQ-5 closed (D-4 to D-6). Title changes are now significant (D-4, amends PD-16). One error code per refusal case, plus an error-precedence rule (§9.3). Exactly one notification on event cancellation. Organizers can book other organizers' events throughout. Attendance "Unmarked" replaced by reverting to `CONFIRMED`. Change-log granularity defined. "Ended" phase removed. Acceptance criteria AC-29 to AC-43 added; AC-28 widened to every AC. At most one notification per attendee per save (D-7). Email marked Won't (this MVP).

### How to read the traceability tags

| Tag | Meaning |
|---|---|
| `I§n` | Derived directly from section *n* of `intent.md`. |
| `D-n` | A decision made by the product owner during spec discovery or review (see §12.2). |
| `PD-n` | A decision proposed during specification and **approved by the product owner** on 2026-10-23 (see §12.3). |

Priorities use MoSCoW: **Must** (required for the MVP demo), **Should** (expected, but can be cut under time pressure), **Could** (only if time permits), **Won't (this MVP)** (specified for later, not built now).

---

## 1. Project Overview and Objectives

### 1.1 Overview

FairSeat is a responsive web application for discovering and booking free professional events. It enforces capacity strictly, allocates freed seats fairly through a first-in, first-out (FIFO) waitlist, and keeps attendees informed of status changes. The initial focus is technology and professional events in Lagos, Nigeria. `I§1`

### 1.2 Objectives

| ID | Objective | Source |
|---|---|---|
| OBJ-1 | Make upcoming free professional events easy to discover without an account. | I§4.1 |
| OBJ-2 | Provide a clear, reliable booking experience with visible status at every step. | I§4.2 |
| OBJ-3 | Never exceed event capacity, including under concurrent booking attempts. | I§4.3 |
| OBJ-4 | Allocate freed seats fairly using a FIFO waitlist. | I§4.4 |
| OBJ-5 | Notify attendees of booking outcomes and significant event changes. | I§4.5 |
| OBJ-6 | Give organizers simple tools to manage events, registrations and attendance. | I§4.6 |
| OBJ-7 | Deliver a working, demonstrable MVP within one week. | I§4.7, I§5 |

### 1.3 Key Definitions

All time comparisons use server time. "Now" means the server's current time at the moment an action is processed.

| Term | Definition | Source |
|---|---|---|
| **Start / End** | The event's start and end date-times. | I§6 |
| **Booking open** | The event is `PUBLISHED` (not `DRAFT` or `CANCELLED`) and now < Start. | I§8.4 |
| **Normal period** | Now < Start − 24 hours. | I§8.3 |
| **Final window** | Start − 24 hours ≤ now < Start. | I§8.4 |
| **Started** | Now ≥ Start. | I§8.4 |
| **Active registration** | A registration in status `WAITLISTED`, `OFFER_PENDING` or `CONFIRMED`. | PD-1 |
| **Confirmed count** | Registrations in `CONFIRMED`, `ATTENDED` or `NO_SHOW`. | I§8.1 |
| **Pending count** | Registrations in `OFFER_PENDING`. | I§8.1 |
| **Available seats** | Capacity − Confirmed count − Pending count. | I§8.1 |
| **Offer base expiry** | Offer issue time + 24 hours. | I§8.3 |
| **Effective offer deadline** | The earlier of the offer base expiry and the event Start. It is always computed from the current Start, so it follows reschedules. | I§8.3, D-2 |
| **Eligible waitlisted attendee** | A registration in status `WAITLISTED`. See BR-12. | I§8.2 |

---

## 2. Scope and Non-Goals

### 2.1 In Scope (MVP)

| Area | Priority |
|---|---|
| Public event discovery: listing, search, filters, details | Must |
| Attendee registration, login and logout | Must |
| Seat booking, cancellation, waitlist, offers, automatic allocation | Must |
| Organizer event management: draft, publish, edit, capacity changes, reschedule, cancel | Must |
| Recording of significant changes and notifying affected attendees | Must |
| Organizer dashboard summaries and registrant lists | Must |
| Manual attendance and no-show recording | Must |
| In-app notifications | Must |
| "My bookings" view with current and past registrations | Must |
| Email notifications | Won't (this MVP): out of scope by D-6 (I§12 lists it as secondary). |

### 2.2 Non-Goals (Excluded from the MVP)

From I§14, plus discovery decision D-3:

- Full administrative dashboard.
- Organizer application, approval and moderation workflows. Organizer accounts are pre-provisioned.
- QR-code or automated check-in.
- Automatic event reminders.
- Saved or bookmarked events.
- Neighborhood-level filters.
- Advanced analytics or demand forecasting.
- Native mobile applications.
- Recommendation algorithms.
- Broad multi-city rollout or large-scale operational support.
- Email verification and self-service password reset (D-3).
- Paid events or payments. FairSeat handles free events only (I§1).

### 2.3 Future Enhancements (Candidates, Not Committed)

Password reset and email verification, email reminders, QR check-in, an organizer onboarding workflow, bookmarks, multi-day events, and additional cities and categories managed through an admin UI.

---

## 3. User Types and Permissions

### 3.1 User Types

| Type | Description | Source |
|---|---|---|
| **Visitor** | Not logged in. | I§6 |
| **Attendee** | A registered account with the Attendee role. Every self-registered account is an Attendee. | I§3.1, I§7 |
| **Organizer** | A pre-provisioned account with the Organizer role. It owns the events it creates. | I§3.2, I§9 |

**PD-2:** An Organizer may also book seats at *other* organizers' events, using the same rules as an Attendee. An Organizer cannot register for their *own* events.

In the requirements below, "attendee" means any logged-in user acting on their own registration. This includes an Organizer booking another organizer's event.

### 3.2 Permission Matrix

| Action | Visitor | Attendee | Organizer (own event) | Organizer (other's event) |
|---|---|---|---|---|
| Browse, search and view published or cancelled events | ✓ | ✓ | ✓ | ✓ |
| View draft event | ✗ | ✗ | ✓ | ✗ |
| Register for an event, join its waitlist | ✗ | ✓ | ✗ (PD-2) | ✓ (PD-2) |
| Cancel booking, leave waitlist, accept or decline offer (own registrations only) | ✗ | ✓ | n/a | ✓ |
| Create, edit, publish or cancel event | ✗ | ✗ | ✓ | ✗ |
| View registrant names and emails | ✗ | ✗ | ✓ | ✗ |
| Record attendance | ✗ | ✗ | ✓ | ✗ |
| View dashboard summaries | ✗ | ✗ | ✓ | ✗ |

The backend enforces every permission on every request. Hiding something in the UI is not sufficient. `I§13`

---

## 4. Functional Requirements

### 4.1 Accounts and Authentication

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-001 | A Visitor can create an account by providing a full name, email address and password. The new account has the Attendee role and is usable immediately. No email verification is required. | I§7, D-3 | Must |
| FR-002 | Email addresses are unique and compared case-insensitively. Registering with an existing email is rejected with `EMAIL_TAKEN`. | PD-3 | Must |
| FR-003 | A user can log in with email and password, and log out. A failed login returns the same `INVALID_CREDENTIALS` error whether the email or the password was wrong. | D-3, PD-3 | Must |
| FR-004 | Organizer accounts are created outside the application, for example by seed data. The application provides no way to become an Organizer. | I§9 | Must |
| FR-005 | Actions that require authentication reject unauthenticated or expired sessions with `UNAUTHENTICATED`. Sessions must expire. The exact session lifetime is a planning decision. | I§13 | Must |

### 4.2 Event Discovery

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-010 | Anyone can view the discovery listing. It contains only events whose status is `PUBLISHED` and that have not started. It is sorted by Start ascending, with ties broken by title ascending. Cancelled events are excluded from the listing (PD-4). | I§6, PD-4 | Must |
| FR-011 | Users can search the listing by keyword. An event matches if its title or description contains the keyword, case-insensitively (PD-5: "topic" is interpreted as description text). | I§6, PD-5 | Must |
| FR-012 | Users can filter the listing by category and by city. Filters combine with each other and with search using AND logic. | I§6 | Must |
| FR-013 | The listing is paginated with 20 events per page (PD-6). | PD-6 | Should |
| FR-014 | Anyone can view the details page of a `PUBLISHED` or `CANCELLED` event, including past events. The page shows title, description, category, date, start and end times, venue, city, organizer name, and the availability state (FR-015). | I§6 | Must |
| FR-015 | The details page shows exactly one availability state: **Seats available** (with the number available); **Full – join waitlist** (with the number waitlisted); **Booking closed – event started**; or **Cancelled**. | I§6, PD-7 | Must |
| FR-016 | Requests for a `DRAFT` event by anyone other than its owner return `EVENT_NOT_FOUND`. | I§9 | Must |
| FR-017 | A logged-in user viewing an event sees their own active registration status, if any, along with the actions currently valid for it. | I§3.1 | Must |

### 4.3 Booking

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-020 | A logged-in user (an Attendee, or an Organizer for another organizer's event, PD-2) can register for an event while booking is open. If Available seats > 0, the registration becomes `CONFIRMED`. Otherwise it becomes `WAITLISTED` at the back of the queue. The response states which outcome occurred. A `WAITLISTED` response includes the queue position. | I§7, I§8.1, PD-8 | Must |
| FR-021 | An attendee can hold at most one active registration per event. Another registration attempt while one is active is rejected with `ALREADY_REGISTERED`. | I§7 | Must |
| FR-022 | Registration is rejected with `REGISTRATION_NOT_ALLOWED` when the requester is the event's organizer. Registration for an event that is not open uses the event-state code: draft → `EVENT_NOT_FOUND` (FR-016), cancelled → `EVENT_CANCELLED`, started → `EVENT_STARTED` (FR-043). When several apply, §9.3 decides. | I§7, PD-2 | Must |
| FR-023 | While booking is open, an attendee can cancel their own `CONFIRMED` registration. It becomes `CANCELLED`, and seat allocation runs (FR-040). | I§7, I§8.3 | Must |
| FR-024 | While booking is open, an attendee can leave the waitlist. Their `WAITLISTED` registration becomes `LEFT_WAITLIST`. | I§7 | Must |
| FR-025 | Once a registration reaches a terminal status, the attendee may register again under FR-020. Re-registering creates a new registration at the back of the queue. No earlier position is restored. | I§7, D-1 | Must |

### 4.4 Waitlist and Offers

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-030 | The waitlist for an event is the set of its `WAITLISTED` registrations, ordered by the time each entered `WAITLISTED`. Ties are broken by registration creation order. | I§8.1 | Must |
| FR-031 | A `WAITLISTED` attendee can see their position: 1 + the number of `WAITLISTED` registrations ahead of them. The UI states that the position does not guarantee a seat. | I§8.1 | Must |
| FR-032 | Issuing an offer changes a registration from `WAITLISTED` to `OFFER_PENDING` and records the issue time. The offer reserves one seat. Its deadline is the Effective offer deadline. | I§8.1, I§8.3 | Must |
| FR-033 | An attendee can accept their `OFFER_PENDING` offer if now < Effective offer deadline. The registration becomes `CONFIRMED`. | I§8.3 | Must |
| FR-034 | An attendee can decline their `OFFER_PENDING` offer if now < Effective offer deadline. The registration becomes `OFFER_DECLINED`, the attendee leaves the waitlist, and seat allocation runs. | I§8.3, D-1 | Must |
| FR-035 | When an offer's Effective offer deadline is reached, the registration becomes `OFFER_EXPIRED` and the attendee leaves the waitlist. If the event has not started, seat allocation runs. | I§8.3, D-1 | Must |
| FR-036 | An attendee with a pending offer sees the deadline as a date and time in WAT, with Accept and Decline actions. | I§8.3 | Must |

### 4.5 Seat Allocation

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-040 | **Seat allocation** runs whenever a seat is freed or added: a `CONFIRMED` cancellation, an offer decline, an offer expiry, or a capacity increase. If the event is not `PUBLISHED` or has started, nothing happens. Otherwise, while Available seats > 0 and the waitlist is non-empty, take the registration at the head of the waitlist and either (a) issue it an offer (FR-032) during the normal period, or (b) set it directly to `CONFIRMED` during the final window. Seats still available afterwards are open for general booking. | I§8.1, I§8.3, I§8.4 | Must |
| FR-041 | During the normal period, a capacity increase of N seats can issue up to N offers at once. Each offer has its own deadline. | I§8.1 | Must |
| FR-042 | No offers are issued during the final window. Offers issued earlier remain valid until their Effective offer deadline. | I§8.4 | Must |
| FR-043 | When an event starts, all booking and allocation activity stops. Registration, cancellation, leaving the waitlist, and accepting or declining offers are rejected with `EVENT_STARTED`. Remaining `OFFER_PENDING` registrations become `OFFER_EXPIRED` without triggering allocation. Remaining `WAITLISTED` registrations become `WAITLIST_CLOSED` (PD-9). | I§8.4, I§11, PD-9 | Must |
| FR-044 | Time-based transitions (offer expiry, event start) are applied within 1 minute of their due time (PD-10). Any user action is validated against the deadline at the moment it is processed, so a late background transition can never allow an action after its deadline. | I§8.3, PD-10 | Must |

### 4.6 Organizer Event Management

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-050 | An Organizer can create an event in `DRAFT` status. Only a title is required to save a draft (PD-11). | I§9, PD-11 | Must |
| FR-051 | An Organizer can edit any field of their own drafts. | I§9 | Must |
| FR-052 | An Organizer can publish a draft only if every field required for publishing is present and valid (BR-30 to BR-38) and the Start is in the future. Publishing changes the status to `PUBLISHED`. | I§9 | Must |
| FR-053 | An Organizer can edit their own `PUBLISHED` event before it starts. Edits after Start are rejected with `EVENT_STARTED` (PD-12). A `CANCELLED` event is read-only: any edit, capacity change, reschedule, publish or repeat cancellation is rejected with `EVENT_CANCELLED` (D-9). | I§9, PD-12, PD-14, D-9 | Must |
| FR-054 | An Organizer can increase the capacity of their own published event before it starts. Seat allocation runs afterwards. | I§8.1 | Must |
| FR-055 | An Organizer can decrease capacity before Start, but not below Confirmed count + Pending count. Violations are rejected with `CAPACITY_BELOW_COMMITTED`. | I§8.1 | Must |
| FR-056 | An Organizer can cancel their own published event before it starts (PD-12). The event becomes `CANCELLED`, every active registration becomes `VOIDED` (PD-1), and each affected attendee receives exactly one "Event cancelled" notification. An optional cancellation reason can be included and is shown in that notification (PD-13). Cancellation does not also send a significant-change notification (FR-061). | I§9, PD-12, PD-13 | Must |
| FR-057 | An Organizer cannot view or change another organizer's drafts, registrations or management functions, including marking attendance on registrations for that organizer's events. Such requests are rejected with `FORBIDDEN`, or with `EVENT_NOT_FOUND` for drafts (D-10). | I§9, I§13 | Must |
| FR-058 | An Organizer sees a list of all their events (drafts, published, cancelled and past), each with its status. | I§9 | Must |
| FR-059 | A published event cannot return to `DRAFT`. A cancelled event cannot be reinstated (PD-14). | PD-14 | Must |

### 4.7 Significant Changes and Rescheduling

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-060 | Changes to a published event's title (D-4), start, end, venue, city (PD-15) or capacity are **significant**. Each changed field is recorded as one change-log entry with the field, old value, new value, time and the organizer who made it. Start and End are full date-times, so moving the date changes both and produces two entries. Cancelling an event is also recorded, as a `status` entry (`PUBLISHED` → `CANCELLED`). | I§9, PD-15, D-4 | Must |
| FR-061 | A significant change notifies every attendee with an active registration for the event (statuses `CONFIRMED`, `OFFER_PENDING` and `WAITLISTED`). This includes capacity changes (D-5). An attendee who receives an offer or a confirmed seat as a direct result of the same save receives only that notice, not the change notice (D-7). Cancellation notifies only through FR-056. | I§9, D-5, D-7 | Must |
| FR-062 | Edits to the description, category and organizer name are saved without notifying attendees and without a change-log entry (PD-16 as amended by D-4). | I§9, PD-16, D-4 | Must |
| FR-063 | **Rescheduling** (changing Start, and usually End) keeps every registration in its current status. Effective offer deadlines are recalculated from the new Start. The new Start must be in the future. If the new timing places the event in its final window, final-window rules (FR-042, FR-040 b) apply from that point. | D-2 | Must |
| FR-064 | When one save changes several significant fields, each attendee receives a single notification listing all the changes (PD-17). Together with D-7, no attendee receives more than one notification from a single save. | PD-17, D-7 | Should |

### 4.8 Organizer Dashboard and Attendance

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-070 | For each of their events, an Organizer sees these counts: capacity, confirmed, pending offers, waitlisted, available seats, cancellations (registrations that reached `CANCELLED`), attended, and no-shows. | I§10 | Must |
| FR-071 | For their own event, an Organizer sees three lists: confirmed attendees (full name, email, status); the waitlist in FIFO order (full name, email, position); and pending offers (full name, email, deadline). | I§3.2, I§10 | Must |
| FR-072 | From Start onwards, for events that are not cancelled, an Organizer can mark a `CONFIRMED` registration as `ATTENDED` or `NO_SHOW`. They can also correct a mark by switching between `ATTENDED` and `NO_SHOW`, or by reverting to `CONFIRMED`. Setting a registration to the status it already has succeeds and changes nothing. Any attendance request on a registration that is not `CONFIRMED`, `ATTENDED` or `NO_SHOW` is rejected with `ATTENDANCE_NOT_ALLOWED` (D-8). | I§10, PD-18, D-8 | Must |
| FR-073 | Attendance can be recorded indefinitely after the event; there is no closing deadline (PD-18). | I§10, PD-18 | Should |

### 4.9 Notifications

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-080 | The system creates an in-app notification for the recipient of each trigger in the table below. | I§12 | Must |
| FR-081 | A logged-in user can see their notifications, newest first, along with an unread count. They can mark a single notification or all notifications as read. | I§12 | Must |
| FR-082 | Each notification includes the event title, a plain-language description of what happened (and, for changes, the old and new values), the time it was created, and a link to the event or booking. | I§12 | Must |
| FR-083 | Email copies of the triggers below are sent only if implemented within the timeline. If email fails, the triggering action is not affected. Not attempted in the MVP (D-6). | I§12, D-6 | Won't (this MVP) |

| Trigger | Recipient | Source |
|---|---|---|
| Registration becomes `CONFIRMED` through direct booking or an accepted offer | The attendee | I§12 |
| Offer issued | The attendee | I§12 |
| Offer expired, including expiry at event start | The attendee | I§12 |
| Seat automatically allocated in the final window | The attendee | I§12 |
| Significant event change (FR-060, excluding cancellation) | All active registrants, except those who receive a seat notice from the same save (D-7) | I§12, D-7 |
| Event cancelled | All registrants whose registrations were voided, one notification each | I§12 |

No notification is sent for joining the waitlist, declining an offer, cancelling a booking, leaving the waitlist, or a waitlist closing at event start. The user sees each of these outcomes on screen when they act, or in their bookings (PD-19).

### 4.10 My Bookings

| ID | Requirement | Source | Priority |
|---|---|---|---|
| FR-090 | A logged-in user sees "My bookings" split into two groups. **Current** holds active registrations for published events that have not started. **Past** holds every other registration, including those for cancelled or started events. | I§3.1, I§7 | Must |
| FR-091 | Each entry shows the event title, date and time, venue, event status, and registration status. Depending on status, it also shows the waitlist position or the offer deadline, and only the actions currently valid. | I§7, I§12 | Must |
| FR-092 | Status is always visible in the application, independent of notifications. | I§12 | Must |

---

## 5. User Workflows and Edge Cases

### 5.1 Workflows

**W-1 Discover events (Visitor).** Open the listing → optionally search and filter → open an event → see its details and availability. Selecting Book prompts the Visitor to log in or register, then returns them to the event.

**W-2 Book a seat.** On a bookable event, select **Book seat** → the system confirms the seat (FR-020), or adds the attendee to the waitlist if the last seat went in the meantime → the outcome and position are shown → a notification is sent if the seat was confirmed.

**W-3 Waitlist to offer.** A seat is freed during the normal period → the head of the waitlist receives an offer and a notification → the attendee then:
- accepts before the deadline → `CONFIRMED`; or
- declines → `OFFER_DECLINED`, and the next attendee is processed; or
- does nothing → `OFFER_EXPIRED` at the deadline, a notification is sent, and the next attendee is processed. If the deadline falls inside the final window, the next attendee is confirmed directly.

**W-4 Freed seat in the final window.** A confirmed attendee cancels, an offer is declined or expires, or capacity increases → the head of the waitlist is confirmed immediately and notified. If the waitlist is empty, the seat is open for general booking.

**W-5 Create and publish an event (Organizer).** Create a draft → fill in the fields → publish → the event appears in the listing.

**W-6 Change capacity.** Edit the capacity → if decreased, it is validated against Confirmed count + Pending count → the change is recorded and active registrants are notified → if increased, seat allocation runs.

**W-7 Reschedule.** Edit the date or start time to a future time → registrations are kept → offer deadlines are recalculated → active registrants are notified, and anyone who can no longer attend cancels normally.

**W-8 Cancel an event.** Cancel before Start → the event is `CANCELLED` → active registrations are `VOIDED` → affected attendees are notified → the event stays viewable with the Cancelled label.

**W-9 Record attendance.** After Start → open the confirmed list → mark each attendee as Attended or No-show → the dashboard counts update.

### 5.2 Edge Cases

| ID | Scenario | Expected behavior |
|---|---|---|
| EC-01 | Two attendees try to book the last seat at the same moment. | One becomes `CONFIRMED`; the other becomes `WAITLISTED` at position 1. Capacity is never exceeded. |
| EC-02 | The same attendee submits two booking requests at the same moment. | Exactly one registration is created. The other request gets `ALREADY_REGISTERED`. |
| EC-03 | An attendee accepts an offer at or after its deadline. | Rejected with `OFFER_EXPIRED`. The offer is treated as expired, even if the background expiry has not run yet. |
| EC-04 | An offer expires at the same moment the attendee accepts it. | Whichever is processed first wins. The outcome is either `CONFIRMED` or `OFFER_EXPIRED`, never both. |
| EC-05 | An offer issued 30 hours before Start expires 6 hours before Start (inside the final window). | The next waitlisted attendee is confirmed directly (FR-040 b). |
| EC-06 | Capacity increases by 3 during the normal period, with 1 attendee waitlisted. | 1 offer is issued, and 2 seats open for general booking. |
| EC-07 | Capacity increases by 2 during the final window, with 3 attendees waitlisted. | The first 2 attendees are confirmed and notified. The third stays waitlisted. |
| EC-08 | The organizer tries to reduce capacity to below Confirmed + Pending. | Rejected with `CAPACITY_BELOW_COMMITTED`. Nothing changes. |
| EC-09 | The organizer cancels the event while offers are pending. | The offers become `VOIDED`. A later accept attempt returns `EVENT_CANCELLED`. |
| EC-10 | The event is rescheduled earlier, into the final window, while an offer is pending. | The offer stays pending. Its deadline becomes min(base expiry, new Start). If that offer is later declined or expires, the seat is allocated directly. |
| EC-11 | The event is rescheduled later, out of the final window. | Normal-period rules apply again. Seats confirmed automatically earlier stay `CONFIRMED`. |
| EC-12 | An attendee declines an offer and then wants a seat after all. | They register again and join at the back of the queue (D-1). |
| EC-13 | Every waitlisted attendee leaves before a seat is freed. | The freed seat opens for general booking. |
| EC-14 | Offers and waitlist entries remain when the event starts. | They become `OFFER_EXPIRED` and `WAITLIST_CLOSED`, respectively. No allocation happens. |
| EC-15 | An attendee tries to cancel after Start. | Rejected with `EVENT_STARTED`. |
| EC-16 | An organizer opens another organizer's registrant list. | Rejected with `FORBIDDEN`. No attendee data is returned. |
| EC-17 | An organizer tries to register for their own event. | Rejected with `REGISTRATION_NOT_ALLOWED`. |
| EC-18 | An organizer tries to record attendance before Start, or for a cancelled event. | Rejected with `ATTENDANCE_NOT_ALLOWED`. |
| EC-19 | An organizer changes only the description. | Saved. No notification is sent. |
| EC-20 | An organizer changes the title of a published event. | Saved, recorded in the change log, and every active registrant is notified with the old and new title (D-4). |
| EC-21 | An attendee tries to accept an offer that was voided by event cancellation. | Rejected with `EVENT_CANCELLED`, not `INVALID_STATUS_TRANSITION` (§9.3). |
| EC-22 | An organizer marks a `WAITLIST_CLOSED` or `CANCELLED` registration as `ATTENDED`. | Rejected with `ATTENDANCE_NOT_ALLOWED` (D-8). |
| EC-23 | An organizer edits, reschedules, changes the capacity of, or cancels again an event that is already `CANCELLED`. | Rejected with `EVENT_CANCELLED`. Nothing changes and no notification is sent (D-9). |
| EC-24 | Organizer X marks attendance on a registration for organizer Y's event. | Rejected with `FORBIDDEN` (D-10). |

---

## 6. Business Rules and Validation

### 6.1 Capacity and Allocation Rules

| ID | Rule | Source |
|---|---|---|
| BR-01 | Confirmed count + Pending count ≤ Capacity at all times. | I§8.1 |
| BR-02 | While booking is open, Available seats > 0 is only allowed when the waitlist is empty (after seat allocation has finished). Seats always go to the waitlist before general booking. | I§8.3, I§8.4, I§16.6 |
| BR-03 | Each pending offer reserves exactly one seat. | I§8.1 |
| BR-04 | The capacity rules in BR-01 to BR-03, and the waitlist and allocation rules in BR-10 to BR-16, are enforced by the backend. | I§13 |

### 6.2 Waitlist and Offer Rules

| ID | Rule | Source |
|---|---|---|
| BR-10 | The waitlist is FIFO by the time each registration entered `WAITLISTED`. | I§8.1 |
| BR-11 | An attendee has at most one active registration per event, so the conditions in I§8.2 hold by construction. Seat allocation still checks them explicitly. | I§8.2 |
| BR-12 | Only `WAITLISTED` registrations are eligible for offers or allocation. A registration that is no longer `WAITLISTED` never blocks the next one. | I§8.2 |
| BR-13 | An offer can be acted on only while now < Effective offer deadline. | I§8.3 |
| BR-14 | A declined or expired offer removes the attendee from the waitlist. They may register again at the back of the queue. | D-1 |
| BR-15 | No offers are issued in the final window. Freed or added seats are confirmed directly to the head of the waitlist. | I§8.4 |
| BR-16 | No booking or allocation activity happens once the event has started. | I§8.4 |

### 6.3 Time Rules

| ID | Rule | Source |
|---|---|---|
| BR-20 | All event times are entered and displayed in West Africa Time (Africa/Lagos, UTC+1, no daylight saving). They are stored without ambiguity, for example in UTC. | PD-20 |
| BR-21 | Boundaries are exclusive at the deadline. An action processed at the exact moment of a deadline, cutoff or Start counts as after it. | PD-21 |
| BR-22 | An event takes place on a single date. End must be later than Start on the same date (PD-22). | I§6, PD-22 |

### 6.4 Field Validation (Applied at Publish, and on Every Edit to a Published Event)

| ID | Field | Rule | Source |
|---|---|---|---|
| BR-30 | Title | Required, 3–120 characters after trimming. | I§9, PD-23 |
| BR-31 | Description | Required, 10–5,000 characters. | I§9, PD-23 |
| BR-32 | Category | Required. Must be one of: Technology, Business, Career and Networking, Design, Entrepreneurship. This list is final for the MVP (D-6). | I§15, D-6 |
| BR-33 | Date and Start | Required. Start must be in the future. | I§9 |
| BR-34 | End | Required. Must be after Start, on the same date. | I§9, PD-22 |
| BR-35 | Venue | Required, 3–200 characters. | I§9, PD-23 |
| BR-36 | City | Required. Chosen from the configured city list, which is seeded with Lagos. | I§6, PD-24 |
| BR-37 | Capacity | Required. Integer from 1 to 10,000, and not below Confirmed + Pending. | I§8.1, PD-23 |
| BR-38 | Organizer name | Required, 2–120 characters. Pre-filled from the organizer's account name. | I§9, PD-25 |
| BR-39 | Account full name | 2–100 characters. Email must be in valid format. Password must be at least 8 characters. | I§7, PD-3 |

### 6.5 Registration State Machine

| From | To | Trigger | Allowed when |
|---|---|---|---|
| — | `CONFIRMED` | Attendee books | Booking open; Available seats > 0 |
| — | `WAITLISTED` | Attendee books | Booking open; Available seats = 0 |
| `WAITLISTED` | `OFFER_PENDING` | Seat allocation | Normal period; head of waitlist |
| `WAITLISTED` | `CONFIRMED` | Seat allocation | Final window; head of waitlist |
| `WAITLISTED` | `LEFT_WAITLIST` | Attendee leaves | Booking open |
| `WAITLISTED` | `WAITLIST_CLOSED` | Event starts | Automatic |
| `OFFER_PENDING` | `CONFIRMED` | Attendee accepts | now < Effective offer deadline |
| `OFFER_PENDING` | `OFFER_DECLINED` | Attendee declines | now < Effective offer deadline |
| `OFFER_PENDING` | `OFFER_EXPIRED` | Deadline reached | Automatic |
| `CONFIRMED` | `CANCELLED` | Attendee cancels | Booking open |
| `CONFIRMED` | `ATTENDED` / `NO_SHOW` | Organizer marks attendance | now ≥ Start; event not cancelled |
| `ATTENDED` ↔ `NO_SHOW`, or either → `CONFIRMED` | (correction) | Organizer corrects a mark | now ≥ Start; event not cancelled |
| `WAITLISTED` / `OFFER_PENDING` / `CONFIRMED` | `VOIDED` | Event cancelled | Automatic |

- **Active statuses:** `WAITLISTED`, `OFFER_PENDING`, `CONFIRMED`.
- **Terminal statuses:** `CANCELLED`, `LEFT_WAITLIST`, `OFFER_DECLINED`, `OFFER_EXPIRED`, `WAITLIST_CLOSED`, `VOIDED`.
- `ATTENDED` and `NO_SHOW` are final outcomes, open only to organizer correction.
- Any transition not listed above is rejected with `INVALID_STATUS_TRANSITION`, except attendance actions, which are rejected with `ATTENDANCE_NOT_ALLOWED` (D-8).

### 6.6 Event Status

| From | To | Allowed when |
|---|---|---|
| — | `DRAFT` | An Organizer creates the event |
| `DRAFT` | `PUBLISHED` | All publish validations pass |
| `PUBLISHED` | `CANCELLED` | Before Start |

"Normal period", "Final window" and "Started" are time-derived phases, not stored statuses.

---

## 7. Data Requirements and Relationships

No storage technology is prescribed. The entities below are logical.

| Entity | Key attributes | Notes |
|---|---|---|
| **User** | id, fullName, email (unique, case-insensitive), password credential (hashed), role (`ATTENDEE` \| `ORGANIZER`), createdAt | Organizers are seeded. |
| **City** | id, name, active | Seeded with Lagos. More cities can be added as data (PD-24). |
| **Event** | id, organizerId → User, title, description, category, start, end, venue, cityId → City, capacity, organizerName, status (`DRAFT` \| `PUBLISHED` \| `CANCELLED`), cancellationReason?, publishedAt?, cancelledAt?, createdAt, updatedAt | The category list is fixed (BR-32). |
| **Registration** | id, eventId → Event, userId → User, status, createdAt, waitlistedAt?, offerIssuedAt?, offerBaseExpiresAt?, confirmedAt?, confirmationSource (`DIRECT` \| `OFFER_ACCEPTED` \| `AUTO_ALLOCATED`)?, endedAt?, attendanceMarkedAt?, attendanceMarkedBy? | At most one *active* registration per (eventId, userId). Past registrations are kept. |
| **RegistrationStatusChange** | id, registrationId, fromStatus, toStatus, occurredAt, actor (user id or `SYSTEM`), reason | Full history of transitions (I§11 history retention). |
| **EventChange** | id, eventId, changedBy, changedAt, field (`title` \| `start` \| `end` \| `venue` \| `city` \| `capacity` \| `status`), oldValue, newValue | Significant changes and cancellation only (FR-060). One entry per changed field. Entries from the same save share changedAt. |
| **Notification** | id, userId, eventId, registrationId?, type, message, createdAt, readAt? | In-app notifications. |

**Relationships:**
- A User (Organizer) has many Events.
- An Event has many Registrations, EventChanges and Notifications.
- A User has many Registrations and Notifications.
- A Registration has many RegistrationStatusChanges.

**Derived values (not stored):** available seats, waitlist position, effective offer deadline, and event phase. Deriving these instead of storing them prevents drift. For example, a reschedule automatically updates every offer deadline.

**Retention:** Nothing in the MVP deletes events, registrations, changes or notifications.

---

## 8. Non-Functional Requirements

| ID | Requirement | Source |
|---|---|---|
| NFR-01 | **Concurrency correctness.** BR-01, FR-021 and FR-040 hold under concurrent requests. When 50 simultaneous booking requests target an event with 10 available seats, exactly 10 become `CONFIRMED` and 40 become `WAITLISTED`, with no duplicates. | I§4.3, I§16.4 |
| NFR-02 | **Atomicity.** Each state change and the seat allocation it triggers complete together or not at all. No intermediate state, such as a freed seat that was never offered, can be observed. | I§16 |
| NFR-03 | **Server-side enforcement.** Every rule in §6 is enforced by the backend, regardless of what the client sends. | I§13 |
| NFR-04 | **Controllable clock for tests.** The system's notion of "now" can be substituted in automated tests, so deadline, cutoff and Start boundaries can be tested deterministically. | I§16.15, PD-26 |
| NFR-05 | **Credential security.** Passwords are stored only as salted, slow (adaptive) hashes. They are never logged or returned. | I§13 |
| NFR-06 | **Contact-data protection.** Attendee email addresses are returned only to the owning organizer (FR-071) and to the attendee themselves. Public and attendee-facing responses contain no other users' personal data. | I§13 |
| NFR-07 | **Responsive design.** All screens are usable from 360px-wide mobile up to desktop widths, without horizontal scrolling. | I§1 |
| NFR-08 | **Accessibility.** Key flows (browse, book, accept or decline, cancel) can be completed by keyboard. Statuses are conveyed by text, not by color alone. | PD-27 |
| NFR-09 | **Performance (demo scale).** With up to 1,000 events and 10,000 registrations, listing and detail requests complete within 1 second at the 95th percentile. | PD-28 |
| NFR-10 | **Deadline processing.** Time-based transitions run within 1 minute of their due time (FR-044). | PD-10 |
| NFR-11 | **Auditability.** Every registration transition and significant event change is recorded, with actor and time. | I§9, I§11 |

---

## 9. Error Handling and Failure Scenarios

### 9.1 Error Catalogue

Every error response includes a stable code and a human-readable message. The UI shows the message and leaves the user's state unchanged.

| Code | Condition |
|---|---|
| `VALIDATION_ERROR` | Field validation failed. The response lists each failing field. |
| `UNAUTHENTICATED` | The session is missing or expired. |
| `FORBIDDEN` | The authenticated user lacks permission for the action, including organizer actions on another organizer's event or its registrations (D-10). |
| `INVALID_CREDENTIALS` | Login failed. |
| `EMAIL_TAKEN` | Registration with an email that already exists. |
| `EVENT_NOT_FOUND` | The event does not exist, or is another organizer's draft. |
| `REGISTRATION_NOT_FOUND` | The registration does not exist, or does not belong to the requester. |
| `EVENT_CANCELLED` | The action targets a cancelled event, including organizer edits, capacity changes, reschedules, publishing or repeat cancellation (D-9). |
| `EVENT_STARTED` | The action is not allowed after Start. |
| `REGISTRATION_NOT_ALLOWED` | The requester is the event's organizer (PD-2). |
| `ALREADY_REGISTERED` | An active registration already exists. |
| `OFFER_EXPIRED` | Accept or decline at or after the Effective offer deadline. |
| `INVALID_STATUS_TRANSITION` | An attendee action (cancel, leave, accept, decline) is not valid for the registration's current status. Not used for attendance actions (D-8). |
| `CAPACITY_BELOW_COMMITTED` | The capacity reduction would fall below Confirmed + Pending. |
| `ATTENDANCE_NOT_ALLOWED` | Any failed attendance action that is not an authentication, ownership or not-found failure: before Start, on a cancelled event, or on a registration that is not `CONFIRMED`, `ATTENDED` or `NO_SHOW` (D-8). |
| `CONFLICT_RETRY` | A concurrent update prevented the action. The client may retry. |

### 9.2 Failure Scenarios

| ID | Scenario | Required handling |
|---|---|---|
| FS-01 | The background job for deadlines is delayed or down. | Actions are still validated against deadlines when processed (FR-044). Overdue transitions are applied when processing resumes, in deadline order. |
| FS-02 | Creating an in-app notification fails. | The notification is part of the same atomic change (NFR-02), so the whole action fails and the user can retry. A status change never happens silently without its notification. |
| FS-03 | Sending an email fails (if implemented). | Logged. The booking state is unaffected. The in-app notification still exists. |
| FS-04 | A user loses connection after submitting a booking. | Viewing the event or "My bookings" again shows the true status. Re-submitting returns `ALREADY_REGISTERED`, not a duplicate. |
| FS-05 | The client shows stale availability. | The server decides the outcome (FR-020). The UI shows the actual result, such as being waitlisted instead of confirmed. |

### 9.3 Error Precedence

When more than one error applies to a request, the backend checks in this order and returns the first that fails:

1. `UNAUTHENTICATED`
2. `VALIDATION_ERROR` (malformed request or invalid fields)
3. `EVENT_NOT_FOUND` / `REGISTRATION_NOT_FOUND` (includes another organizer's draft, and, for attendee actions, registrations owned by someone else)
4. `FORBIDDEN` / `REGISTRATION_NOT_ALLOWED`
5. `EVENT_CANCELLED`
6. `EVENT_STARTED`
7. `OFFER_EXPIRED`
8. `ALREADY_REGISTERED` / `INVALID_STATUS_TRANSITION` / `CAPACITY_BELOW_COMMITTED` / `ATTENDANCE_NOT_ALLOWED`

`CONFLICT_RETRY` may be returned at any point when a concurrent update wins.

Exceptions: attendance (FR-072) applies to started events, so step 6 is skipped and an attendance request before Start fails with `ATTENDANCE_NOT_ALLOWED`. Likewise, an attendance request for a cancelled event fails with `ATTENDANCE_NOT_ALLOWED`, not `EVENT_CANCELLED` (EC-18). For organizer actions, a registration belongs to the event's organizer: an organizer acting on a registration for another organizer's event fails at step 4 with `FORBIDDEN`, not at step 3 (D-10).

---

## 10. Acceptance Criteria

Each criterion is written as Given / When / Then. Success criteria from I§16 are shown in brackets.

**Discovery [SC-1]**
- **AC-01** Given published future, draft, cancelled and past events, when a Visitor opens the listing, then only the published future events appear, sorted soonest first.
- **AC-02** Given events in Lagos and Abuja across several categories, when the Visitor filters by Lagos and Technology and searches "react", then only Lagos Technology events whose title or description contains "react" (any case) appear.
- **AC-03** Given a cancelled event, when anyone opens its details page, then it shows the Cancelled state and no booking action.

**Accounts [SC-2]**
- **AC-04** Given an email that is already registered, typed in a different case, when a Visitor registers with it, then the request fails with `EMAIL_TAKEN`.
- **AC-05** Given a logged-out user, when they attempt to book, then the request fails with `UNAUTHENTICATED`.

**Booking and duplicates [SC-2, SC-3, SC-4]**
- **AC-06** Given an event with 1 available seat, when an attendee books, then they are `CONFIRMED`, available seats become 0, and they receive a confirmation notification.
- **AC-07** Given an attendee with any active registration for an event, when they book that event again, then the request fails with `ALREADY_REGISTERED`.
- **AC-08** Given 10 available seats and 50 concurrent booking requests from different attendees, when they are processed, then exactly 10 are `CONFIRMED` and 40 are `WAITLISTED` in positions 1 to 40, with no position repeated.

**Waitlist and offers [SC-5, SC-8, SC-9]**
- **AC-09** Given waitlisted attendees A, B and C, in that order, during the normal period, when a confirmed attendee cancels, then A gets an offer with deadline min(issue + 24h, Start), and B and C stay in positions 1 and 2.
- **AC-10** Given A's pending offer, when A accepts before the deadline, then A is `CONFIRMED` and no further offer is issued.
- **AC-11** Given A's pending offer, when A declines, then A is `OFFER_DECLINED` and off the waitlist, and B receives an offer.
- **AC-12** Given A's pending offer during the normal period, when the deadline passes, then A is `OFFER_EXPIRED` and notified, and B receives an offer.
- **AC-13** Given A's pending offer, when A accepts at the exact deadline, then the request fails with `OFFER_EXPIRED`.
- **AC-14** Given a pending offer, when the system computes available seats, then that seat counts as unavailable to general booking.

**Capacity [SC-6, SC-7]**
- **AC-15** Given capacity 10 with 8 confirmed and 1 pending, when the organizer sets capacity to 8, then the request fails with `CAPACITY_BELOW_COMMITTED`. Setting it to 9 succeeds.
- **AC-16** Given a full event with 2 waitlisted during the normal period, when capacity increases by 3, then both receive offers and 1 seat opens for general booking. Confirmed attendees receive one capacity-change notice each. The two attendees who received offers get only their offer notice (D-7).

**Final window [SC-10]**
- **AC-17** Given an event 10 hours from Start with A and B waitlisted, when a confirmed attendee cancels, then A becomes `CONFIRMED` immediately, is notified, and no offer is created.
- **AC-18** Given an offer issued 30 hours before Start that is still pending, when its deadline passes 6 hours before Start, then the next waitlisted attendee is `CONFIRMED` directly.
- **AC-19** Given an event in its final window with an empty waitlist, when a confirmed attendee cancels, then the seat becomes bookable by anyone.

**Event start [SC-11]**
- **AC-20** Given an event with a pending offer and waitlisted attendees, when Start is reached, then the offer becomes `OFFER_EXPIRED`, waitlisted entries become `WAITLIST_CLOSED`, and booking, cancellation, accept, decline and leave requests all fail with `EVENT_STARTED`.

**Event changes [SC-12]**
- **AC-21** Given a published event with confirmed, pending and waitlisted registrants, when the organizer changes the venue, then a change record exists and every active registrant gets one notification with the old and new venue.
- **AC-22** Given a pending offer with base expiry 20 hours from now, when the event is rescheduled so that Start is 5 hours from now, then the offer's effective deadline is 5 hours from now and all registrations keep their statuses.
- **AC-23** Given a published event, when the organizer edits only the description, then no notification is created.
- **AC-24** Given a published event with active registrations, when the organizer cancels it, then the event shows Cancelled, all active registrations become `VOIDED`, each affected attendee is notified, and the event stays viewable.

**Organizer management and attendance [SC-13, SC-14]**
- **AC-25** Given organizer X, when X requests organizer Y's registrant list, then the request fails with `FORBIDDEN` and no attendee data is returned.
- **AC-26** Given an event before Start, when the organizer marks attendance, then the request fails with `ATTENDANCE_NOT_ALLOWED`. After Start, marking a confirmed attendee `ATTENDED` updates the attended count on the dashboard.
- **AC-27** Given an event with known registrations, when the organizer opens the dashboard, then the counts for confirmed, pending, waitlisted, available, cancellations, attended and no-shows match the registrations exactly.

**Test coverage [SC-15]**
- **AC-28** Automated tests cover the backend behavior of every other acceptance criterion (AC-01 to AC-27 and AC-29 to AC-46), using a controllable clock (NFR-04). This includes tests at exactly the deadline, exactly the final-window cutoff, and exactly Start. UI-only aspects (labels, disclaimer text, grouping on screen) may be verified by a manual demo checklist instead.

**Booking lifecycle [SC-2, SC-5]**
- **AC-29** Given waitlisted attendees A, B and C, in that order, when B leaves the waitlist, then B is `LEFT_WAITLIST` and C's position becomes 2.
- **AC-30** Given A declined an offer, when A registers for the same event again while it is full, then a new `WAITLISTED` registration is created at the back of the queue, and the old registration remains `OFFER_DECLINED`.
- **AC-31** Given a `WAITLISTED` attendee at position 3, when they view the event or My bookings, then they see "position 3" together with a statement that the position does not guarantee a seat.
- **AC-32** Given an Organizer X and an event owned by Organizer Y, when X books Y's event, then the booking succeeds under FR-020. When X books their own event, the request fails with `REGISTRATION_NOT_ALLOWED`.

**Final window [SC-10]**
- **AC-33** Given an event in its final window with A, B and C waitlisted and no seats available, when capacity increases by 2, then A and B become `CONFIRMED` and each receives only the seat-confirmed notice (D-7), C stays `WAITLISTED` at position 1 and receives the capacity-change notice, and no offer is created.

**Organizer management [SC-1, SC-13]**
- **AC-34** Given a draft missing a required field, or with Start in the past, when the organizer publishes it, then the request fails with `VALIDATION_ERROR` listing each failing field, and the event stays `DRAFT`. Given a fully valid draft, publishing succeeds and the event appears in the listing.
- **AC-35** Given organizer Y's draft, when a Visitor, an Attendee or organizer X requests it, then each request fails with `EVENT_NOT_FOUND`. Y can view it.
- **AC-36** Given a confirmed registration marked `ATTENDED` after Start, when the organizer switches it to `NO_SHOW` and then reverts it to `CONFIRMED`, then each change succeeds, is recorded in the registration history, and the attended and no-show counts update.

**Event changes [SC-12]**
- **AC-37** Given a published event with active registrants, when the organizer changes the title, then a change record exists and every active registrant gets one notification with the old and new title.
- **AC-38** Given a published event with active registrants, when one save changes venue and Start, then the change log has one entry per changed field, and each active registrant gets exactly one notification listing all the changes.
- **AC-39** Given a published event with active registrations, when the organizer cancels it with a reason, then each affected attendee has exactly one new notification, of type "Event cancelled", containing the reason, and no significant-change notification is created.

**Errors [SC-15]**
- **AC-40** Given a pending offer voided by event cancellation, when the attendee accepts it, then the request fails with `EVENT_CANCELLED`. Given a started event, when an attendee books it, then the request fails with `EVENT_STARTED`.

**Accounts, notifications and My bookings [SC-2]**
- **AC-41** Given a session that has expired, when the user attempts any authenticated action, then the request fails with `UNAUTHENTICATED`.
- **AC-42** Given a user with 3 unread notifications, when they open notifications, then they are listed newest first with an unread count of 3. Marking one as read gives a count of 2, and marking all as read gives 0.
- **AC-43** Given a user with a `CONFIRMED` registration for a future event, a `WAITLISTED` registration for another future event, an `OFFER_DECLINED` registration, and a `VOIDED` registration for a cancelled event, when they open My bookings, then the first two appear under Current and the other two under Past, each with its event status, registration status and only its valid actions.

**Errata coverage (v1.1) [SC-13, SC-15]**
- **AC-44** Given a started event with a `WAITLIST_CLOSED` registration and a `CANCELLED` registration, when the organizer marks either as `ATTENDED`, then the request fails with `ATTENDANCE_NOT_ALLOWED`. Given a registration already marked `ATTENDED`, when the organizer marks it `ATTENDED` again, then the request succeeds and the counts are unchanged.
- **AC-45** Given a `CANCELLED` event, when its organizer changes the venue, changes the capacity, reschedules it, or cancels it again, then each request fails with `EVENT_CANCELLED`, the event is unchanged, and no notification or change record is created.
- **AC-46** Given organizer X and a confirmed registration for organizer Y's started event, when X marks it `ATTENDED`, then the request fails with `FORBIDDEN` and the registration is unchanged.

---

## 11. Dependencies and External Integrations

| Dependency | Needed for | Status |
|---|---|---|
| React frontend, Java Spring Boot backend | Whole system | Fixed by I§5 |
| Persistent data store supporting atomic, concurrency-safe updates | NFR-01, NFR-02 | Choice deferred to planning |
| Scheduled or background processing | FR-035, FR-043, FR-044 | Mechanism deferred to planning |
| Email delivery service | FR-083 only | Not needed for the MVP (D-6) |
| Hosting and deployment | Demo | Deferred to planning (I§5) |
| Seed data: organizer accounts, Lagos city record, categories | FR-004, BR-32, BR-36 | Required before demo |

There are no other external integrations in the MVP. Organizers and attendees must be recruited if a real pilot is attempted (I§5).

---

## 12. Assumptions, Constraints and Open Questions

### 12.1 Constraints

- Three-person team: two members on the backend, one on frontend and product. One-week duration. React and Spring Boot. `I§5`
- A working demonstration is the priority. It is not evidence of product-market fit. `I§5`

### 12.2 Discovery Decisions (Confirmed by the Product Owner)

| ID | Decision |
|---|---|
| D-1 | A declined or expired offer removes the attendee from the waitlist. They may re-register at the back of the queue. |
| D-2 | Rescheduling keeps every booking, offer and waitlist entry. Offer deadlines are recalculated from the new Start. The final-window rules apply if the new timing falls inside that window. |
| D-3 | Account features in the MVP: register, log in, log out. No email verification or password reset. Organizers are pre-provisioned. |
| D-4 | A title change to a published event is significant. It is recorded in the change log and notifies active registrants. This amends PD-16. (Closes OQ-2.) |
| D-5 | Capacity changes notify every active registrant: `CONFIRMED`, `OFFER_PENDING` and `WAITLISTED`. (Closes OQ-3.) |
| D-6 | The five categories are final for the MVP. Events are single-day only. Email notifications are not attempted in the MVP. (Closes OQ-1, OQ-4 and OQ-5.) |
| D-7 | When a save that makes a significant change also gives an attendee an offer or a confirmed seat, that attendee receives only the offer or seat notice, not the change notice. |
| D-8 | Every failed attendance action that isn't an authentication, ownership or not-found failure returns `ATTENDANCE_NOT_ALLOWED`. `INVALID_STATUS_TRANSITION` is for attendee actions only. Re-applying the current attendance status is a successful no-op. (v1.1) |
| D-9 | Cancelled events are read-only. Edits, capacity changes, reschedules, publishing and repeat cancellation are rejected with `EVENT_CANCELLED`. (v1.1) |
| D-10 | For organizer actions, a registration belongs to the event's organizer. Another organizer acting on it gets `FORBIDDEN`. `REGISTRATION_NOT_FOUND` is for attendee actions on someone else's registration. (v1.1) |

### 12.3 Proposed Decisions (Approved by the Product Owner, 2026-10-23)

| ID | Decision | Rationale |
|---|---|---|
| PD-1 | Event cancellation sets active registrations to a terminal `VOIDED` status. | Satisfies I§11: event cancellation remains an event-level status, while the history still shows that the booking ended. |
| PD-2 | Organizers can book other organizers' events but not their own. | Keeps the role model simple and stops organizers inflating their own counts. |
| PD-3 | Email is unique and case-insensitive. Password minimum is 8 characters. Login errors are generic. | Baseline security without adding scope. |
| PD-4 | Cancelled events are excluded from the discovery listing but reachable by direct link and through booking history. | I§6 limits the listing to published events and also requires cancelled events to remain accessible. |
| PD-5 | "Topic" search matches title and description text. There is no separate tags field. | I§6 doesn't define "topic". Tags would add a data field and UI. |
| PD-6 | Listing page size is 20. | Conventional. |
| PD-7 | Availability labels as listed in FR-015. | Makes status unambiguous. |
| PD-8 | A single "book" action: the system confirms or waitlists, then reports the result. | Avoids a race between seeing a free seat and booking it. Joining the waitlist by mistake is harmless, since the attendee can leave. |
| PD-9 | Waitlist entries become `WAITLIST_CLOSED` at Start, with no notification. | I§11 requires defining this. Notifying everyone that they didn't get a seat adds noise. |
| PD-10 | Time-based transitions run within 1 minute, and actions are validated against deadlines when processed. | Precise where it matters, simple to build. |
| PD-11 | Drafts require only a title. | Lets organizers save work in progress. |
| PD-12 | Published events can't be edited or cancelled after Start. | There's nothing meaningful left to change or cancel. |
| PD-13 | Cancellation can include an optional reason, shown to attendees. | Improves the cancellation notice at very low cost. |
| PD-14 | Published events can't revert to draft. Cancelled events can't be reinstated. | Avoids complex states. Reinstating would need its own booking rules. |
| PD-15 | A city change counts as significant, along with the venue. | A city change is a stronger version of a venue change. |
| PD-16 | Description, category and organizer-name edits never notify attendees. (Amended by D-4: title edits are significant.) | I§9 only exempts minor or non-substantive edits. |
| PD-17 | Several significant changes in one save produce one notification. | Avoids notification spam. |
| PD-18 | Attendance marks can be corrected and have no recording deadline. | Organizers make mistakes; I§10 allows recording "during or after". |
| PD-19 | No notifications for actions the user takes themselves (join, decline, cancel, leave). | The result is already shown on screen. |
| PD-20 | All times in WAT (Africa/Lagos). | All target cities share one time zone. |
| PD-21 | Deadlines are exclusive. | Makes boundary tests deterministic. |
| PD-22 | Events take place on a single date. | Matches I§6 ("Date, start and end times"). Confirmed by D-6. |
| PD-23 | Field length and capacity limits as listed in BR-30 to BR-38. | Needed for testable validation. The values are adjustable. |
| PD-24 | Cities come from a managed list seeded with Lagos. New cities are added as data, with no UI. | I§6 wants a model ready for more cities, without building admin tools. |
| PD-25 | Organizer information on an event is the organizer's display name. | The minimal reading of I§9. |
| PD-26 | The clock can be substituted in tests. | I§16.15 can't be tested reliably otherwise. |
| PD-27 | Baseline accessibility as described in NFR-08. | Low cost, broad benefit. |
| PD-28 | Performance targets at demo scale. | Gives NFR-09 a testable threshold. |

### 12.4 Assumptions

- **A-1** Seat availability and statuses update when a page loads or the user acts. Real-time push to open pages is not required.
- **A-2** Attendees can't edit their account details in the MVP. This isn't listed in the intent.
- **A-3** One attendee books one seat for themselves. There are no group bookings or guest seats.

### 12.5 Open Questions

All open questions are closed.

| ID | Question | Resolution |
|---|---|---|
| OQ-1 | Is the five-category list (I§15) final? | Yes (D-6). |
| OQ-2 | Should a title change notify attendees? | Yes; it is significant (D-4). |
| OQ-3 | Should capacity changes notify confirmed attendees, or only waitlisted ones? | Every active registrant (D-5). |
| OQ-4 | Are multi-day or overnight events needed for the pilot? | No; single-day only (D-6, PD-22). |
| OQ-5 | Will email (FR-083) be attempted? | No (D-6). |

---

## Appendix A — Interface Expectations (Proposed, Resource-Level)

This appendix exists so the frontend and backend can be built in parallel. Paths are illustrative. The final API contract belongs in planning.

| Method and path | Purpose | Auth | FRs |
|---|---|---|---|
| `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` | Account management | — / — / User | FR-001–005 |
| `GET /events?q=&category=&city=&page=` | Discovery listing | Public | FR-010–013 |
| `GET /events/{id}` | Event details, plus the caller's own registration if logged in | Public | FR-014–017 |
| `GET /cities` · `GET /categories` | Filter values | Public | FR-012 |
| `POST /events/{id}/registrations` | Book or join the waitlist | Attendee, or Organizer (not own event) | FR-020–022 |
| `GET /me/registrations` | My bookings | User | FR-090–091 |
| `POST /registrations/{id}/cancel` · `/leave` · `/accept` · `/decline` | Registration actions | Owner | FR-023–024, 033–034 |
| `GET /me/notifications` · `POST /me/notifications/{id}/read` · `POST /me/notifications/read-all` | Notifications | User | FR-081 |
| `GET /organizer/events` · `POST /organizer/events` | List and create own events | Organizer | FR-050, 058 |
| `PATCH /organizer/events/{id}` | Edit draft or published event, including capacity and reschedule | Owner | FR-051–055, 060–064 |
| `POST /organizer/events/{id}/publish` · `/cancel` | Status changes | Owner | FR-052, 056 |
| `GET /organizer/events/{id}/summary` · `/registrations` · `/changes` | Dashboard, registrant lists, change log | Owner | FR-060, 070–071 |
| `POST /organizer/registrations/{id}/attendance` | Mark Attended or No-show, or revert to Confirmed | Owner | FR-072 |

## Appendix B — Traceability to Intent Success Criteria (I§16)

| SC | Covered by |
|---|---|
| 1 Discovery without login | FR-010–016, AC-01–03, AC-35 |
| 2 Register, book, waitlist, manage | FR-001–005, 020–025, 081, 090–091, AC-04–07, AC-29–32, AC-41–43 |
| 3 No duplicate active registrations | FR-021, AC-07 |
| 4 Capacity never exceeded under concurrency | BR-01, NFR-01, AC-08 |
| 5 FIFO allocation | FR-030–031, BR-10, AC-09, AC-29, AC-31 |
| 6 Added capacity goes to the waitlist first | FR-040–041, BR-02, AC-16, AC-33 |
| 7 No capacity cut below confirmed + pending | FR-055, AC-15 |
| 8 Offers reserve seats and expire correctly | FR-032–035, AC-12–14 |
| 9 Decline or expiry advances the queue | FR-034–035, AC-11–12 |
| 10 Final-window direct allocation | FR-040 b, FR-042, AC-17–19, AC-33 |
| 11 Activity stops at Start | FR-043, AC-20 |
| 12 Changes and cancellation handled and notified | FR-056, 060–064, AC-21–24, AC-37–39 |
| 13 Organizers manage events and attendance without manual seat assignment | FR-050–059, 072, AC-25–26, AC-34–36, AC-44–46 |
| 14 Booking and attendance info for organizers | FR-070–071, AC-27, AC-36 |
| 15 Edge-case test coverage | NFR-04, §9.3, AC-28, AC-40, AC-44–46 |