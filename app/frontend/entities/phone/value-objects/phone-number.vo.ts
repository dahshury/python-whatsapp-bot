import { ValueObject } from "@/shared/domain/value-object";
import { BaseError } from "@/shared/libs/errors/base-error";

// E.164 format validation
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

export class PhoneNumber extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value || typeof value !== "string") {
      throw BaseError.validation("Phone number is required");
    }
    if (!PHONE_REGEX.test(value)) {
      throw BaseError.validation(
        "Invalid phone number format. Expected E.164 format (e.g., +1234567890)"
      );
    }
  }
}

export default PhoneNumber;
