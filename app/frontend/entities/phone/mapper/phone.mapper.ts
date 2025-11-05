import type { PhoneDto } from "../infrastructure/dto/phone.dto";
import type { PhoneOption } from "../types/phone.types";

export function phoneDtoToDomain(dto: PhoneDto): PhoneOption {
  const option: PhoneOption = {
    number: dto.number,
    name: dto.name,
    country: dto.country,
    label: dto.label,
  };
  if (dto.id !== undefined) {
    option.id = dto.id;
  }
  if (dto.displayNumber !== undefined) {
    option.displayNumber = dto.displayNumber;
  } else {
    option.displayNumber = dto.number;
  }
  return option;
}

export function phoneDomainToDto(domain: PhoneOption): PhoneDto {
  const dto: PhoneDto = {
    number: domain.number,
    name: domain.name,
    country: domain.country,
    label: domain.label,
  };
  if (domain.id !== undefined) {
    dto.id = domain.id;
  }
  if (domain.displayNumber !== undefined) {
    dto.displayNumber = domain.displayNumber;
  }
  return dto;
}
