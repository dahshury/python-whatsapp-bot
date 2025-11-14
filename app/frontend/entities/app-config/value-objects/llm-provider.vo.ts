import { ValueObject } from "@/shared/domain";

const DEFAULT_LLM_PROVIDER = "openai";
const SUPPORTED_PROVIDERS = new Set(["openai", "anthropic", "gemini"]);

export class LlmProviderVO extends ValueObject<string> {
  static fromUnknown(value?: string | null): LlmProviderVO {
    return new LlmProviderVO(value ?? DEFAULT_LLM_PROVIDER);
  }

  protected validate(value: string): void {
    const normalized = value.toLowerCase().trim();
    if (!SUPPORTED_PROVIDERS.has(normalized)) {
      const allowed = Array.from(SUPPORTED_PROVIDERS).sort().join(", ");
      throw new Error(`LLM provider must be one of: ${allowed}`);
    }
  }

  get provider(): string {
    return this.value.toLowerCase();
  }
}
