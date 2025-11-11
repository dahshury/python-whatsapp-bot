import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TOAST_TIMEOUT_MS } from "@/features/calendar/lib/constants";
import { saveCustomerDocument } from "@/shared/api/endpoints.api";
import { updateCustomerCaches } from "../utils/updateCustomerCaches";

export type UpdateCustomerAgeParams = {
  waId: string;
  age: number | null;
  isLocalized?: boolean;
};

export function useUpdateCustomerAge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateCustomerAgeParams) => {
      const response = await saveCustomerDocument({
        waId: params.waId,
        age: params.age,
      });

      if (!(response as { success?: boolean }).success) {
        throw new Error(
          (response as { message?: string }).message ||
            "Failed to update customer age"
        );
      }

      return response;
    },

    onSuccess: (response, params) => {
      // Extract age from response - backend may return it in different formats
      let updatedAge: number | null = params.age;
      const responseAge = (response as { age?: unknown }).age;
      if (responseAge !== undefined) {
        // Backend might return age as a dict with {wa_id, age, age_recorded_at} or directly as a number
        if (typeof responseAge === "object" && responseAge !== null) {
          const ageData = responseAge as { age?: number | null };
          updatedAge = ageData.age ?? null;
        } else if (typeof responseAge === "number") {
          updatedAge = responseAge;
        } else if (responseAge === null) {
          updatedAge = null;
        }
      }

      updateCustomerCaches(queryClient, params.waId, { age: updatedAge });

      // Don't trigger reload event immediately - it can cause race conditions
      // The cache update above should be sufficient for the grid to reflect the change
      // If a reload is needed, it should happen after the mutation completes successfully
      // and only if the grid doesn't automatically react to the cache update

      toastService.success(
        i18n.getMessage("age_recorded", params.isLocalized),
        undefined,
        TOAST_TIMEOUT_MS
      );
    },

    onError: (error, params) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : i18n.getMessage("save_error", params.isLocalized);
      toastService.error(
        i18n.getMessage("save_error", params.isLocalized),
        errorMessage,
        TOAST_TIMEOUT_MS
      );
    },
  });
}
