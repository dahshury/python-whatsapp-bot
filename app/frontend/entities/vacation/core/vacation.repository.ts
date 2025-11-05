import type { VacationDomain } from "./vacation.domain";

export type VacationRepository = {
  getAll(): Promise<VacationDomain[]>;
  save(vacation: VacationDomain): Promise<VacationDomain>;
  delete(id: string): Promise<boolean>;
};
