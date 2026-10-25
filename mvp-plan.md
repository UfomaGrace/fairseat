# FairSeat MVP Implementation Plan

**Status:** MVP delivery plan  
**Deadline:** Monday, 26 October 2026  
**Scope:** Minimum viable product for capstone submission

## 1. Objective

Deliver a working FairSeat MVP that allows attendees to discover events and book seats, while organizers can create and manage events. The application must demonstrate the core user journey, enforce business rules through the backend, and be deployable and testable.

This plan prioritizes the capstone MVP requirements over completing every feature in the full `plan.md`.

## 2. MVP Scope

### Must Have

**Attendee**
- View available published events.
- View event details, including date, venue, and available seats.
- Register and log in.
- Book one seat for an event.
- View booking confirmation and booking status.
- View their bookings and cancel a booking where permitted.

**Organizer**
- Register and log in using the agreed authentication flow.
- Create and publish an event.
- View and manage their own events.
- View relevant booking information.

**System**
- Enforce authentication and role-based authorization on the backend.
- Prevent duplicate bookings by the same attendee for the same event.
- Enforce event capacity on the server and protect against overbooking under concurrent requests.
- Persist data in the database.
- Display loading, empty, error, success, and confirmation states across the MVP journey.
- Provide seed data for the demonstration.
- Deploy the frontend and backend and document their addresses.
- Provide the OpenAPI contract and required decision records.

### Include Only If the Core Journey Is Complete

- Waitlist joining and offer acceptance/decline.
- Notifications.
- Additional organizer dashboard statistics.
- Advanced search, filters, and pagination.

### Defer Until After MVP Submission

- QR-code check-in.
- Automated attendance tracking.
- Advanced analytics.
- UI animations and nonessential visual polish.
- Features not required by the capstone brief or the core booking journey.

**Rule:** Do not implement optional features at the expense of a working, tested, and deployed core journey.

## 3. Implementation Order

### Phase 1: Confirm Requirements and API Contract
- Review `intent.md` and `spec.md`.
- Compare the MVP scope against the capstone brief.
- Confirm endpoint paths, request and response shapes, error responses, and authentication behavior with the backend team.
- Identify which endpoints are ready and which are still pending.
- Agree on how the frontend will access the deployed backend.

**Completion criteria:** Frontend and backend use an agreed API contract.

### Phase 2: Set Up the Frontend
- Initialize or verify the React, TypeScript, and Vite project.
- Configure routing and the application layout.
- Set up API integration using the agreed API contract.
- Configure environment variables for the API base URL.
- Reuse the shared UI components where available.

**Completion criteria:** The application starts successfully and can communicate with the backend.

### Phase 3: Build the Attendee Journey
Implement in this order:
1. Event discovery page.
2. Event details page.
3. Registration and login.
4. Seat booking.
5. Booking confirmation.
6. My bookings and cancellation.

Include appropriate loading, empty, error, success, and confirmation states.

**Completion criteria:** An attendee can complete the core booking journey using persisted backend data.

### Phase 4: Build the Organizer Journey
- Create the event form.
- Validate required fields.
- Submit events to the backend.
- Display the organizer's events.
- Allow the organizer to view and manage their own events according to the API contract.

**Completion criteria:** An authenticated organizer can create an event and manage only events they are authorized to access.

### Phase 5: Integrate and Verify
- Replace temporary mock data with backend responses for the core journey.
- Verify authentication and authorization behavior.
- Verify duplicate-booking prevention.
- Verify event capacity enforcement, including concurrent booking attempts.
- Verify all five required UI states.
- Check error messages and form validation.
- Test the main attendee and organizer journeys.
- Fix critical bugs before adding optional features.

**Completion criteria:** Core flows work against the real backend, and required business rules are enforced server-side.

### Phase 6: Deploy and Prepare the Demo
- Deploy the frontend and backend.
- Configure production environment variables.
- Verify frontend-to-backend communication in production.
- Confirm database persistence and seed data.
- Test the deployed application from a fresh browser session.
- Document the deployed URLs and API documentation.
- Prepare a short demonstration covering the attendee and organizer journeys.
- Confirm the required decision records and submission artifacts are present.

**Completion criteria:** The deployed MVP is accessible, demonstrable, and ready for submission.

## 4. Backend Dependencies

The frontend depends on the backend team for:
- Agreed authentication and session behavior.
- Event discovery and event detail endpoints.
- Event creation and organizer authorization.
- Booking creation, retrieval, and cancellation.
- Consistent validation and error responses.
- Database persistence and seed data.
- Server-enforced booking and capacity rules.
- OpenAPI documentation and a deployed API.

Use mock data or MSW only when necessary to develop UI independently. Clearly identify mocks and do not present mocked functionality as completed backend integration.

## 5. Security and Business Rules

- The backend is the source of truth for authentication, authorization, booking status, and capacity.
- Never rely on frontend checks alone to enforce business rules.
- An attendee must not access another attendee's private bookings.
- An organizer must not manage another organizer's events.
- Booking limits and capacity must be checked atomically or protected by appropriate database constraints and transactions.
- Follow the authentication and CSRF approach agreed with the backend team.
- Do not store session credentials or passwords in browser local storage.
- Display dates and times consistently in West Africa Time (Africa/Lagos).

## 6. MVP Acceptance Checklist

### Core Functionality
- [ ] Published events can be discovered.
- [ ] Event details are displayed correctly.
- [ ] Attendees can register and log in.
- [ ] An attendee can book a seat.
- [ ] A successful booking produces a clear confirmation.
- [ ] Attendees can view their bookings.
- [ ] Permitted cancellations work.
- [ ] Organizers can create and publish events.
- [ ] Organizers can manage only their own events.

### Required Verification
- [ ] Loading state demonstrated.
- [ ] Empty state demonstrated.
- [ ] Error state demonstrated.
- [ ] Success state demonstrated.
- [ ] Confirmation state demonstrated.
- [ ] Duplicate booking is prevented by the backend.
- [ ] Event capacity cannot be exceeded, including concurrent booking attempts.
- [ ] Authentication and authorization are enforced server-side.
- [ ] Data persists in the database.
- [ ] Seed data is available for the demonstration.

### Submission Readiness
- [ ] Frontend deployed.
- [ ] Backend deployed.
- [ ] Both deployed addresses documented.
- [ ] OpenAPI contract available.
- [ ] Required decision records included.
- [ ] Main flows tested in the deployed environment.
- [ ] Demo sequence prepared.
- [ ] No known critical bugs remain.

## 7. Prioritization Rules

When time is limited, work in this order:

1. Required backend integration and core attendee journey.
2. Required organizer journey.
3. Server-enforced business rules and verification.
4. Deployment and submission artifacts.
5. Required UI states and critical usability fixes.
6. Optional features and visual polish.

If a dependency blocks progress, continue with an isolated frontend implementation using the agreed API contract, and record what still needs integration. Do not silently remove a mandatory requirement.

## 8. Relationship to the Full Plan

This document defines the immediate MVP delivery scope. The root `plan.md` remains the broader frontend implementation roadmap.

After MVP submission:
- Review unfinished items against `spec.md`.
- Move deferred features back into the full implementation roadmap.
- Update task status based on what was actually delivered.
- Do not mark mocked, partially integrated, or unverified functionality as complete.

## 9. Final Definition of Done

The MVP is complete when the required attendee and organizer flows work, backend business rules are enforced and verified, the five required UI states are demonstrable, the application is deployed, and the required capstone artifacts are ready for review.