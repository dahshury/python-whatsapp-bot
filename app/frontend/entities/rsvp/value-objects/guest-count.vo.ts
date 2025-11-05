import { ValueObject } from "@/shared/domain/value-object";
import { BaseError } from "@/shared/libs/errors/base-error";

const MAX_GUEST_COUNT = 100;

export class GuestCount extends ValueObject<number> {
  protected validate(value: number): void {
    if (!Number.isInteger(value) || value < 1) {
      throw BaseError.validation("Guest count must be a positive integer");
    }
    if (value > MAX_GUEST_COUNT) {
      throw BaseError.validation(
        `Guest count exceeds maximum limit (${MAX_GUEST_COUNT})`
      );
    }
  }
}

export default GuestCount;
