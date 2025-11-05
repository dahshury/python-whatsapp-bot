export type UserDto = {
  id: string;
  waId: string;
  name?: string | undefined;
  phone: string;
  email?: string | undefined;
  language?: "en" | "ar" | undefined;
  notifications?: boolean | undefined;
  timezone?: string | undefined;
  createdAt: number;
  updatedAt?: number | undefined;
};
