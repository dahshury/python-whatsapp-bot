import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TOAST_TIMEOUT_MS } from "@/features/calendar/lib/constants";
import { saveCustomerDocument } from "@/shared/api/endpoints.api";
import { customerKeys, documentKeys } from "@/shared/api/query-keys";
import { updateCustomerCaches } from "../utils/updateCustomerCaches";

export type UpdateCustomerNameParams = {
  waId: string;
  name: string;
  isLocalized?: boolean;
};

export function useUpdateCustomerName() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateCustomerNameParams) => {
      const response = await saveCustomerDocument({
        waId: params.waId,
        name: params.name,
      });

      if (!(response as { success?: boolean }).success) {
        throw new Error(
          (response as { message?: string }).message ||
            "Failed to update customer name"
        );
      }

      return response;
    },

    onSuccess: (response, params) => {
      // Extract name from response - backend may return it in different formats
      let updatedName: string = params.name;
      const responseName = (response as { name?: unknown }).name;
      if (responseName !== undefined) {
        // Backend might return name as a dict or directly as a string
        if (typeof responseName === "object" && responseName !== null) {
          const nameData = responseName as {
            customer_name?: string;
            name?: string;
          };
          updatedName = nameData.customer_name ?? nameData.name ?? params.name;
        } else if (typeof responseName === "string") {
          updatedName = responseName;
        }
      }

      updateCustomerCaches(queryClient, params.waId, { name: updatedName });

      toastService.success(
        i18n.getMessage("saved", params.isLocalized),
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

    onSettled: (_data, _error, params) => {
      // Always refetch to ensure cache consistency
      queryClient.invalidateQueries({
        queryKey: documentKeys.byWaId(params.waId),
      });
      queryClient.invalidateQueries({
        queryKey: customerKeys.gridData(params.waId),
      });
    },
  });
}
