export const RSVPStatus = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  CANCELLED: "cancelled",
  DECLINED: "declined",
} as const;

export type RSVPStatus = (typeof RSVPStatus)[keyof typeof RSVPStatus];

export type RSVP = {
  id: string | number;
  eventId: string;
  customerId: string;
  status: RSVPStatus;
  createdAt: string;
  updatedAt?: string;
};

export type ReservationRequest = {
  customerId: string;
  eventId: string;
  guestCount?: number;
  specialRequests?: string;
};

export type ReservationResponse = {
  success: boolean;
  rsvp?: RSVP;
  message?: string;
};
