import { ValueObject } from "@/shared/domain";

const DEFAULT_TIMEZONE = "Asia/Riyadh";

const isValidTimezone = (value: string): boolean => {
  try {
    // Use Intl.DateTimeFormat to validate timezone
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
};

export class TimezoneVO extends ValueObject<string> {
  static fromUnknown(value?: string | null): TimezoneVO {
    return new TimezoneVO(value ?? DEFAULT_TIMEZONE);
  }

  protected validate(value: string): void {
    if (!value || typeof value !== "string" || !value.trim()) {
      throw new Error("Timezone cannot be empty");
    }
    if (!isValidTimezone(value)) {
      throw new Error(`Invalid timezone identifier: ${value}`);
    }
  }

  get timezone(): string {
    return this.value;
  }
}
