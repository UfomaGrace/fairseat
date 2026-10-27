
export type EventFormat = "IN_PERSON" | "ONLINE" | "HYBRID";

export interface Event {
  id: string;
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  venue: string;
  imageUrl?: string;
  availableSeats: number;
  category: string;
  format?: EventFormat;
  organizerName?: string;
}
