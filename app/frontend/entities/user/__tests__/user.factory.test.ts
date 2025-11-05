import { expect, test } from "vitest";
import { createNewUser, createUserFromDto } from "@/entities/user";

test("createNewUser creates domain with defaults", () => {
  const user = createNewUser({ waId: "w1", phone: "+1234567890" });
  expect(user.id).toBeTypeOf("string");
  expect(user.waId).toBe("w1");
  expect(user.phone).toBe("+1234567890");
});

test("createUserFromDto maps partial dto safely", () => {
  const user = createUserFromDto({
    id: "u1",
    waId: "w2",
    phone: "+19876543210",
  });
  expect(user.id).toBe("u1");
  expect(user.waId).toBe("w2");
  expect(user.phone).toBe("+19876543210");
});
