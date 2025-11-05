import type { PhoneOption } from "../types/phone.types";

export type PhoneRepository = {
  search(query: string): Promise<PhoneOption[]>;
  create(option: PhoneOption): Promise<PhoneOption>;
};
