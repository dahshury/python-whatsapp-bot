import type { AppConfig, AppConfigUpdateInput } from "@/entities/app-config";

export type AppConfigUseCase = {
  getConfig(): Promise<AppConfig>;
  updateConfig(input: AppConfigUpdateInput): Promise<AppConfig>;
};
