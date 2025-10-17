import { useMemo } from "react";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";
import { getColumnsForSchema } from "@/shared/libs/data-grid/schemas/registry";

export function useCustomerColumns(localized: boolean): IColumnDefinition[] {
	return useMemo<IColumnDefinition[]>(
		() => getColumnsForSchema("customer", { localized }),
		[localized]
	);
}
