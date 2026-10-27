
import type { Event } from "../types/event";

export const mockEvents: Event[] = [
  {
    id: "event-001",
    title: "Lagos Tech Meetup",
    description:
      "Meet developers and technology enthusiasts to exchange ideas, learn, and build meaningful connections.",
    startDateTime: "2026-11-07T10:00:00+01:00",
    endDateTime: "2026-11-07T14:00:00+01:00",
    venue: "Victoria Island, Lagos",
    availableSeats: 25,
    category: "Technology",
  },
  {
    id: "event-002",
    title: "Product Design Connect",
    description:
      "Explore user experience, design thinking, and practical approaches to solving product design challenges.",
    startDateTime: "2026-11-14T12:00:00+01:00",
    endDateTime: "2026-11-14T16:00:00+01:00",
    venue: "Yaba, Lagos",
    availableSeats: 12,
    category: "Design",
  },
  {
    id: "event-003",
    title: "Women in Tech Networking",
    description:
      "Connect with professionals, exchange experiences, and discover opportunities in technology.",
    startDateTime: "2026-11-21T11:00:00+01:00",
    endDateTime: "2026-11-21T15:00:00+01:00",
    venue: "Ikeja, Lagos",
    availableSeats: 0,
    category: "Networking",
  },
];
