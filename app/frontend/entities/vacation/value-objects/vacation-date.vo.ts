import { ValueObject } from "@/shared/domain/value-object";
import { BaseError } from "@/shared/libs/errors/base-error";

export class VacationDate extends ValueObject<string> {
  protected validate(value: string): void {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw BaseError.validation("Invalid vacation date format");
    }
  }

  toDate(): Date {
    return new Date(this._value);
  }

  isAfter(other: VacationDate): boolean {
    return this.toDate().getTime() > other.toDate().getTime();
  }

  isBefore(other: VacationDate): boolean {
    return this.toDate().getTime() < other.toDate().getTime();
  }
}

export default VacationDate;
