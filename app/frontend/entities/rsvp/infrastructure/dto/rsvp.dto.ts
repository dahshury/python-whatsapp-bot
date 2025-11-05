import type { RSVPStatus } from "../../types/rsvp.types";

export type RsvpDto = {
  id?: string | number;
  eventId: string;
  customerId: string;
  status: RSVPStatus;
  createdAt?: string;
  updatedAt?: string;
};
