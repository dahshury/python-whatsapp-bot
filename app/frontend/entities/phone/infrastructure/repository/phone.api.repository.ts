import type { ApiClient } from "@/shared/api";
import type { PhoneRepository } from "../../core/phone.repository";
import { phoneDomainToDto, phoneDtoToDomain } from "../../mapper/phone.mapper";
import type { PhoneOption } from "../../types/phone.types";
import { PhoneAdapter } from "../api/phone.adapter";

export class PhoneApiRepository implements PhoneRepository {
  private readonly api: ReturnType<typeof PhoneAdapter>;

  constructor(apiClient: ApiClient) {
    this.api = PhoneAdapter(apiClient);
  }

  async search(query: string): Promise<PhoneOption[]> {
    const dtos = await this.api.search(query);
    return dtos.map((d) => phoneDtoToDomain(d));
  }

  async create(option: PhoneOption): Promise<PhoneOption> {
    const dto = phoneDomainToDto(option);
    const created = await this.api.create(dto);
    return phoneDtoToDomain(created);
  }
}
