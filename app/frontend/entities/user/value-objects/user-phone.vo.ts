import { ValueObject } from "@/shared/domain/value-object";
import { BaseError } from "@/shared/libs/errors/base-error";

// E.164-like validation (simple): + or digits, 8-15 length
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export class UserPhone extends ValueObject<string> {
  protected validate(value: string): void {
    if (!PHONE_REGEX.test(value)) {
      throw BaseError.validation("Invalid phone format");
    }
  }
}

export default UserPhone;
