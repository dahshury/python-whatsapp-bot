import type { QueryClient } from "@tanstack/react-query";
import { DOCUMENT_QUERY_KEY } from "@/entities/document";

type CustomerCachePartial = {
  name?: string | null;
  age?: number | null;
};

const hasOwn = <K extends PropertyKey>(
  value: object,
  key: K
): value is Record<K, unknown> => Object.hasOwn(value, key);

/**
 * Helper to keep document- and grid-level caches in sync after a mutation.
 * Accepts the partial fields that changed and updates both caches without forcing a refetch.
 */
export function updateCustomerCaches(
  queryClient: QueryClient,
  waId: string,
  partial: CustomerCachePartial
): void {
  if (!waId) {
    return;
  }

  const nameChanged = hasOwn(partial, "name");
  const ageChanged = hasOwn(partial, "age");

  if (!(nameChanged || ageChanged)) {
    return;
  }

  // Update main document cache
  queryClient.setQueriesData(
    { queryKey: DOCUMENT_QUERY_KEY.byWaId(waId) },
    (oldData: unknown) => {
      if (!oldData) {
        return oldData;
      }
      const data = oldData as {
        name?: string | null;
        age?: number | null;
        document?: unknown;
      };
      const next = { ...data };
      if (nameChanged) {
        next.name = partial.name ?? null;
      }
      if (ageChanged) {
        next.age = partial.age ?? null;
      }
      return next;
    }
  );

  // Update auxiliary grid cache if present
  queryClient.setQueriesData(
    { queryKey: ["customer-grid-data", waId] },
    (oldData: unknown) => {
      if (!oldData) {
        return oldData;
      }
      const data = oldData as {
        name?: string | undefined;
        age?: number | null;
      };
      const next = { ...data };
      if (nameChanged) {
        next.name = partial.name ?? undefined;
      }
      if (ageChanged) {
        next.age = partial.age ?? null;
      }
      return next;
    }
  );
}
