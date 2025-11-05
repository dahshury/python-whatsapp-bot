import type { RsvpDomain } from "../../core/rsvp.domain";
import type { RsvpRepository } from "../../core/rsvp.repository";
import { rsvpDomainToDto, rsvpDtoToDomain } from "../../mapper/rsvp.mapper";
import { RsvpAdapter } from "../api/rsvp.adapter";

export class RsvpApiRepository implements RsvpRepository {
  private readonly adapter = RsvpAdapter();

  async getById(id: string | number): Promise<RsvpDomain | null> {
    const dto = await this.adapter.getById(id);
    return dto ? rsvpDtoToDomain(dto) : null;
  }

  async save(rsvp: RsvpDomain): Promise<RsvpDomain> {
    const dto = rsvpDomainToDto(rsvp);
    const saved = await this.adapter.save(dto);
    return rsvpDtoToDomain(saved);
  }

  async update(rsvp: RsvpDomain): Promise<RsvpDomain> {
    const dto = rsvpDomainToDto(rsvp);
    const updated = await this.adapter.update(dto);
    return rsvpDtoToDomain(updated);
  }
}
