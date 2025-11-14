"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AppConfigUpdateInput } from "@/entities/app-config";
import { APP_CONFIG_QUERY_KEY } from "@/entities/app-config";
import { createAppConfigService } from "../services/app-config.service.factory";
import { emitAppConfigUpdated } from "./useConfigLiveSync";

const service = createAppConfigService();

export const useUpdateAppConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AppConfigUpdateInput) => service.updateConfig(input),
    onSuccess: (updatedConfig) => {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY.all(), updatedConfig);
      emitAppConfigUpdated();
    },
  });
};
