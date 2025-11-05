import type { RsvpDomain } from "./rsvp.domain";

export type RsvpRepository = {
  getById(id: string | number): Promise<RsvpDomain | null>;
  save(rsvp: RsvpDomain): Promise<RsvpDomain>;
  update(rsvp: RsvpDomain): Promise<RsvpDomain>;
};
