import { ValueObject } from "@/shared/domain/value-object";
import { BaseError } from "@/shared/libs/errors/base-error";

const MAX_MESSAGE_TEXT_LENGTH = 10_000;

export class MessageText extends ValueObject<string> {
  protected validate(value: string): void {
    if (typeof value !== "string") {
      throw BaseError.validation("Message text must be a string");
    }
    if (value.trim().length === 0) {
      throw BaseError.validation("Message text cannot be empty");
    }
    if (value.length > MAX_MESSAGE_TEXT_LENGTH) {
      throw BaseError.validation("Message text exceeds maximum length");
    }
  }
}

export default MessageText;
