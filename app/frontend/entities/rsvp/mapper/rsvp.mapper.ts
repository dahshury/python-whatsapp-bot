import { RsvpDomain } from "../core/rsvp.domain";
import type { RsvpDto } from "../infrastructure/dto/rsvp.dto";
import type { RSVP } from "../types/rsvp.types";

export function rsvpDtoToDomain(dto: RsvpDto): RsvpDomain {
  return new RsvpDomain({
    id: dto.id ?? "",
    eventId: dto.eventId,
    customerId: dto.customerId,
    status: dto.status,
    createdAt: dto.createdAt || new Date().toISOString(),
    updatedAt: dto.updatedAt || new Date().toISOString(),
  } as RSVP);
}

export function rsvpDomainToDto(domain: RsvpDomain): RsvpDto {
  const v = domain.value;
  const dto: RsvpDto = {
    eventId: v.eventId,
    customerId: v.customerId,
    status: v.status,
  };
  if (v.id !== undefined && v.id !== "") {
    dto.id = v.id;
  }
  if (v.createdAt !== undefined) {
    dto.createdAt = v.createdAt;
  }
  if (v.updatedAt !== undefined) {
    dto.updatedAt = v.updatedAt;
  }
  return dto;
}
