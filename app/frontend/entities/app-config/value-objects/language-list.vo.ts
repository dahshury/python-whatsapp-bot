import { ValueObject } from "@/shared/domain";

const LANGUAGE_CODE_REGEX = /^[a-z]{2,5}$/i;
const DEFAULT_LANGUAGE = "en";

const normalizeLanguage = (lang: string) => lang.trim().toLowerCase();

export class LanguageListVO extends ValueObject<string[]> {
  constructor(languages: string[]) {
    super(LanguageListVO.normalize(languages));
  }

  static fromUnknown(languages?: string[] | null): LanguageListVO {
    return new LanguageListVO(languages ?? [DEFAULT_LANGUAGE]);
  }

  private static normalize(languages: string[]): string[] {
    if (!Array.isArray(languages)) {
      return [DEFAULT_LANGUAGE];
    }
    const unique = Array.from(
      new Set(
        languages
          .filter((lang) => typeof lang === "string")
          .map((lang) => normalizeLanguage(lang))
      )
    ).filter((lang) => LANGUAGE_CODE_REGEX.test(lang));
    return unique.length > 0 ? unique : [DEFAULT_LANGUAGE];
  }

  protected validate(value: string[]): void {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("At least one language must be provided");
    }
    for (const lang of value) {
      if (!LANGUAGE_CODE_REGEX.test(lang)) {
        throw new Error(`Invalid language code: ${lang}`);
      }
    }
  }
}
