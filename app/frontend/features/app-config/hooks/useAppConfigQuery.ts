"use client";

import { useQuery } from "@tanstack/react-query";
import { APP_CONFIG_QUERY_KEY } from "@/entities/app-config";
import { createAppConfigService } from "../services/app-config.service.factory";

const service = createAppConfigService();

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const STALE_TIME_MINUTES = 1;
const GC_TIME_MINUTES = 5;

export const useAppConfigQuery = () =>
  useQuery({
    queryKey: APP_CONFIG_QUERY_KEY.all(),
    queryFn: () => service.getConfig(),
    staleTime:
      STALE_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
    gcTime: GC_TIME_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
    refetchOnWindowFocus: true,
  });
