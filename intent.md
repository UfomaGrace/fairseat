# FairSeat — Intent Document

## 1. Product Overview

FairSeat is a responsive web application that makes discovering and booking free professional events fair, transparent, and straightforward.

The initial focus is technology and professional events in Lagos, Nigeria, with the possibility of expanding to other Nigerian cities and event categories in the future.

FairSeat aims to provide one place where attendees can discover events, book seats, join waitlists, track their registration status, and receive updates. Organizers can publish and manage events, control capacity, manage registrations, and record attendance.

## 2. Problem Statement

Free professional events are often managed using disconnected tools such as chat groups, online forms, and spreadsheets.

This creates problems for attendees, who may struggle to discover relevant events, understand availability, track bookings, or receive timely updates.

Organizers may struggle with overbooking, cancellations, no-shows, waitlist management, and keeping registration information organized.

FairSeat aims to address these problems through centralized event discovery, capacity-controlled booking, fair waitlist allocation, and timely notifications.

## 3. Target Users

### 3.1 Attendees

Attendees should be able to:
- Browse upcoming published events without logging in.
- Search for events by title or topic.
- Filter events by category and city.
- View event details and availability.
- Create an account and log in.
- Book one seat per event.
- Join and track a waitlist when an event is full.
- Accept or decline a waitlist offer.
- Cancel a confirmed booking before the event starts.
- Leave a waitlist.
- Receive in-app notifications about relevant booking and event changes.
- View current and past bookings and their statuses.

### 3.2 Organizers

Authorized organizers should be able to:
- Create, edit, publish, and cancel their own events.
- Save events as drafts before publishing.
- Set and manage event capacity.
- View confirmed registrations and waitlisted attendees.
- View attendee names and email addresses for their own events.
- Increase event capacity subject to the waitlist rules.
- Record attendance and no-shows.
- View basic booking, cancellation, and attendance summaries.

## 4. Product Goals

FairSeat should:
1. Make relevant free professional events easier to discover.
2. Provide a clear and reliable booking experience.
3. Prevent bookings from exceeding event capacity, including during concurrent booking attempts.
4. Allocate released seats fairly using a first-in, first-out (FIFO) waitlist.
5. Keep attendees informed about booking status and significant event changes.
6. Give organizers a simple way to manage registrations and attendance.
7. Deliver a working, demonstrable MVP within the project timeline.

## 5. Project Constraints and Technical Direction

- Team size: three people.
- Project duration: one week.
- Frontend: React.
- Backend: Java with Spring Boot.
- Two team members will focus on backend engineering; the frontend and product-related work will be handled by the remaining team member.
- Database, authentication implementation, deployment provider, and notification implementation remain to be confirmed during specification and technical planning.
- The initial priority is a working demonstration. A small real-world pilot may be attempted if suitable organizers and attendees can be recruited.
- A successful demonstration must not be treated as proof of product-market fit.

## 6. Event Discovery

- Anyone may browse upcoming published events without logging in.
- Only published events that have not yet started appear in the main discovery listing.
- Events are ordered by the soonest upcoming start time first.
- Users can search by event title or topic.
- Users can filter by category and city.
- Lagos is the initial focus, but the data model and experience should allow other Nigerian cities.
- Event details include:
  - Title and description.
  - Category.
  - Date.
  - Start and end times.
  - Venue and city.
  - Organizer information.
  - Availability, waitlist, or other relevant booking status.
- Cancelled events remain accessible with a clear Cancelled status.
- Past events remain available through relevant booking history and organizer reporting.
- Saving or bookmarking events is outside the MVP.

## 7. Accounts and Booking Rules

- Users must have an account and be logged in to book a seat, join a waitlist, or manage their registrations.
- Registration is expected to collect the user's full name, email address, and password; exact authentication requirements will be specified later.
- Each attendee may hold a maximum of one confirmed seat per event.
- Duplicate active registrations for the same event must be prevented.
- Event capacity must never be exceeded, including when multiple users attempt to book simultaneously.
- Booking, cancellation, and offer acceptance must respect the event's current status and start time.
- Attendees can cancel confirmed bookings before the event starts.
- Attendees can leave a waitlist before receiving a confirmed booking.
- Attendees can decline a pending seat offer.
- After cancelling a booking, an attendee may register again if booking is still open and capacity or waitlist rules allow it. Their previous waitlist position is not restored.
- Attendees can view their current and past bookings and relevant registration outcomes.

## 8. Capacity and Waitlist Rules

### 8.1 Capacity

- An event must not have more confirmed bookings and pending seat reservations combined than its capacity.
- A pending waitlist offer temporarily reserves one seat.
- When an event is full, eligible new registrants join the waitlist.
- Waitlist position is determined by FIFO order.
- Attendees can see their current waitlist position, but the position is not a guarantee of receiving a seat.
- Organizers may increase capacity before the event starts.
- Organizers may not reduce capacity below the total of confirmed bookings and pending offers.
- When capacity increases outside the final 24 hours and a waitlist exists, new seats are offered to the first eligible waitlisted attendees, up to the number of additional seats. Multiple offers may be issued simultaneously, with an individual expiry deadline for each offer. When capacity increases during the final 24 hours, §8.4 applies.

### 8.2 Waitlist Eligibility

An attendee is eligible for a seat offer or allocation only if:
- Their waitlist entry is active.
- They do not already have a confirmed booking for the event.
- They do not already have another pending offer for the event.
- They have not left the waitlist or otherwise become ineligible.

The waitlist must retain its original FIFO order. Ineligible entries must not prevent the next eligible attendee from receiving a seat.

### 8.3 Normal Waitlist Offers

- When a confirmed booking is cancelled before the final 24-hour cutoff, the released seat is offered to the next eligible attendee in FIFO order.
- A normal offer expires 24 hours after it is issued, unless the event starts sooner.
- An attendee cannot accept an offer after the event has started.
- The effective deadline is the earlier of the offer's 24-hour expiry and the event start time.
- If an offer is declined or expires, the next eligible attendee receives an offer, provided the normal offer period has not closed. If the normal offer period has closed, §8.4 applies.
- If no eligible waitlisted attendee remains, the seat becomes available for general booking if booking is still open.

### 8.4 Final 24 Hours Before an Event

- No new waitlist offers are issued during the final 24 hours before the event starts.
- Any seat that becomes available during this period is immediately allocated as a confirmed booking to the next eligible attendee in FIFO waitlist order. This applies whether the seat was released by a cancelled booking, a declined or expired offer, or a capacity increase. When capacity increases, this repeats for each additional seat.
- The attendee is notified that their booking is confirmed; they do not need to accept an offer.
- If no eligible waitlisted attendee exists, the seat becomes available for general booking.
- All booking and seat-allocation activity stops when the event starts.
- Existing offers issued before the 24-hour cutoff retain their original expiry deadline, but cannot be accepted after the event starts. Their effective deadline remains the earlier of the offer expiry or event start.
- The system must handle event timing and seat allocation consistently if an organizer changes the event date or start time. The exact handling of existing offers after such changes will be defined in the specification.

## 9. Organizer Event Management

- Only pre-authorized organizer accounts can create and manage events.
- A full organizer application, approval, or onboarding workflow is outside the MVP.
- Organizers can save draft events.
- Draft events are not publicly discoverable and cannot accept bookings.
- The following information is required before an event can be published:
  - Title.
  - Description.
  - Category.
  - Date.
  - Start and end times.
  - Venue and city.
  - Capacity.
  - Organizer information.
- Organizers can edit and cancel their own published events.
- Organizers cannot manage events belonging to other organizers.
- Significant changes to a published event must be recorded and communicated to affected attendees. Significant changes include:
  - Date.
  - Start or end time.
  - Venue.
  - Capacity.
  - Cancellation.
- Minor spelling corrections and non-substantive description edits do not require attendee notifications.
- Cancelling an event invalidates its active bookings and pending offers and notifies affected attendees.
- Cancelled events remain visible with a clear Cancelled status.
- Past events remain available for history and reporting.

## 10. Organizer Dashboard and Attendance

The organizer dashboard should display basic summaries, including:
- Confirmed bookings.
- Waitlisted attendees.
- Available seats.
- Cancellations.
- Attendance count.
- No-shows.

Organizers may view attendee full names and email addresses only for their own events.

Organizers can manually record attendance from the event's start time onward, including during or after the event.

A no-show should be recorded only when the organizer can reasonably establish that the attendee did not attend.

QR-code check-in and automated attendance tracking are outside the MVP.

## 11. Booking and Event Statuses

The system should distinguish booking-related outcomes from event-level status.

Relevant booking-related states and outcomes include:
- Confirmed.
- Waitlisted.
- Offer pending.
- Cancelled.
- Offer declined.
- Offer expired.
- Attended.
- No-show.

Event cancellation is an event-level status, not a booking status.

The specification must define valid status transitions, which statuses are active, how historical outcomes are retained, and how cancelled events affect booking history.

It must also clarify how declined or expired offers affect future waitlist eligibility, what happens to remaining waitlist entries at event start, and how offer deadlines respond to event rescheduling.

## 12. Notifications

In-app notifications are the baseline for:
- Booking confirmation.
- Waitlist seat offers.
- Relevant offer decline or expiry outcomes.
- Significant event changes.
- Event cancellation.
- Immediate confirmation when a seat is allocated during the final 24 hours.

Users must also be able to see their current booking and event statuses in the application; notifications must not be the only source of status information.

Email notifications are a secondary priority if time permits.

Automatic event reminders are outside the MVP.

## 13. Security and Access Boundaries

- Attendees can manage only their own registrations.
- Organizers can manage only their own events and the associated registrations.
- Public event browsing does not require authentication.
- Booking and organizer management actions require appropriate authorization.
- The backend must enforce capacity, duplicate-registration, eligibility, and allocation rules rather than relying only on frontend checks.
- The specification must define authentication, authorization, and protection of attendee contact information.

## 14. MVP Non-Goals

The following are outside the initial MVP:
- A full administrative dashboard.
- Organizer application, approval, and moderation workflows.
- QR-code or automated check-in.
- Automatic event reminders.
- Saved or bookmarked events.
- Neighborhood-level event filters.
- Advanced analytics or demand forecasting.
- Native mobile applications.
- Complex recommendation algorithms.
- Broad multi-city rollout or large-scale operational support.

## 15. Proposed Event Categories

Initial proposed categories:
- Technology.
- Business.
- Career and Networking.
- Design.
- Entrepreneurship.

The final category list can be confirmed during specification.

## 16. Success Criteria

The MVP should demonstrate that:
1. Users can discover upcoming published events without logging in.
2. Attendees can register, log in, book seats, join waitlists, and manage their registrations.
3. Duplicate active registrations are prevented.
4. Event capacity is never exceeded, including during concurrent booking attempts.
5. Waitlisted attendees receive seats in FIFO order.
6. Additional capacity is allocated to eligible waitlisted attendees before general availability.
7. Organizers cannot reduce capacity below confirmed bookings plus pending offers.
8. Pending offers reserve seats and follow the defined expiry rules.
9. Declined or expired offers advance the queue appropriately when normal offers are still permitted.
10. During the final 24 hours, any released or added seat goes immediately to the next eligible waitlisted attendee, or to general booking if nobody is eligible.
11. Booking and allocation activity stops when an event starts.
12. Event changes and cancellations are handled correctly and affected attendees are notified.
13. Organizers can manage their own events and record attendance without manually assigning seats.
14. Relevant booking and attendance information is available to organizers.
15. Functional and edge-case testing covers booking, cancellation, waitlist allocation, capacity changes, offer expiry, event changes, authorization, and event start-time boundaries.

The team should attempt to validate the experience with real attendees and organizers if feasible. A working demonstration alone does not establish product-market fit. Because seats allocated in the final 24 hours are confirmed automatically, some recipients may be unable to attend; no-show rates should be interpreted with this in mind.

## 17. Next Step

All product decisions required at the intent stage have been made. Questions intentionally deferred to the specification are listed in §8.4 (event rescheduling), §11 (status transitions and eligibility) and §13 (authentication and data protection).

The next step is to produce `spec.md`, translating the approved intent into precise functional and non-functional requirements, user flows, business rules, state transitions, data requirements, API expectations, error handling, acceptance criteria, and test scenarios.

No implementation should begin until the specification and the next stage of the AI-native SDLC workflow have been reviewed and approved.