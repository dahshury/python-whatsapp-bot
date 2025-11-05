// Domain
export { PhoneDomain } from "./core/phone.domain";
export {
  createNewPhone,
  createPhoneFromDto,
  createPhoneFromOption,
  normalizePhoneOption,
} from "./core/phone.factory";
export type { PhoneRepository } from "./core/phone.repository";
export { PHONE_QUERY_KEY } from "./infrastructure/api/phone.query-key";
export type { PhoneDto } from "./infrastructure/dto/phone.dto";
// Infrastructure
export { PhoneApiRepository } from "./infrastructure/repository/phone.api.repository";
export { phoneDomainToDto, phoneDtoToDomain } from "./mapper/phone.mapper";
// Types
export type { PhoneOption } from "./types/phone.types";
// UI
export * from "./ui";
// Value Objects
export * from "./value-objects";
