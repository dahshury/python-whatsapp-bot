import { ValueObject } from "@/shared/domain/value-object";
import { BaseError } from "@/shared/libs/errors/base-error";

const MAX_DOCUMENT_TITLE_LENGTH = 200;

export class DocumentTitle extends ValueObject<string> {
  protected validate(value: string): void {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw BaseError.validation("Document title cannot be empty");
    }
    if (value.length > MAX_DOCUMENT_TITLE_LENGTH) {
      throw BaseError.validation("Document title too long");
    }
  }
}

export default DocumentTitle;
