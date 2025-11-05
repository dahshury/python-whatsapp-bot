import { UserEmail } from "../value-objects/user-email.vo";
import { UserPhone } from "../value-objects/user-phone.vo";
import { UserDomain, type UserEntityProps } from "./user.domain";

export function createNewUser(
  input: Omit<UserEntityProps, "id" | "createdAt"> & { id?: string }
): UserDomain {
  // Validate eagerly via VOs
  if (input.email) {
    new UserEmail(input.email);
  }
  new UserPhone(input.phone);

  return new UserDomain({
    id: input.id || "",
    createdAt: Date.now(),
    waId: input.waId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    language: input.language,
    notifications: input.notifications ?? true,
    timezone: input.timezone ?? "UTC",
  });
}

export function createUserFromDto(dto: unknown): UserDomain {
  const d = dto as Partial<UserEntityProps>;
  return new UserDomain({
    id: String(d.id || ""),
    waId: String(d.waId || ""),
    name: d.name,
    phone: String(d.phone || ""),
    email: d.email,
    language: d.language,
    notifications: d.notifications ?? true,
    timezone: d.timezone ?? "UTC",
    createdAt: Number(d.createdAt || Date.now()),
    updatedAt: d.updatedAt ? Number(d.updatedAt) : undefined,
  });
}
