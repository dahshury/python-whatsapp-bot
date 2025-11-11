import type { QueryClient } from "@tanstack/react-query";

type CustomerName = {
  wa_id: string;
  customer_name: string | null;
};

/**
 * Updates the customer names cache for a specific customer without refetching.
 * This ensures all components using customer names see the update in real-time.
 */
export const updateCustomerNamesCache = (
  queryClient: QueryClient,
  waId: string,
  customerName: string | null
): void => {
  queryClient.setQueryData<Record<string, CustomerName>>(
    ["customer-names"],
    (old) => {
      if (!old) {
        return old;
      }

      const updated = { ...old };
      const existing = updated[waId];

      // Only update if the name actually changed
      if (existing?.customer_name !== customerName || !existing) {
        updated[waId] = {
          wa_id: waId,
          customer_name: customerName,
        };
        return updated;
      }

      return old;
    }
  );

  // Also update customer grid data cache if it exists
  queryClient.setQueryData<{ name: string; age: number | null }>(
    ["customer-grid-data", waId],
    (old) => {
      if (!old) {
        return old;
      }

      // Only update if name changed
      if (old.name !== customerName) {
        return {
          ...old,
          name: customerName || "",
        };
      }

      return old;
    }
  );
};
