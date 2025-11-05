import type { UserDomain } from "./user.domain";

export type UserRepository = {
  getById(id: string): Promise<UserDomain | null>;
  getByWaId(waId: string): Promise<UserDomain | null>;
  save(user: UserDomain): Promise<UserDomain>;
  update(user: UserDomain): Promise<UserDomain>;
};
