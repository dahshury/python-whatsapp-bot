import { createSettingsService } from "../services/settings.service.factory";
import { createUseThemeSetting } from "./useThemeSetting";

const svc = createSettingsService();
export const useThemeSetting = createUseThemeSetting(svc);
