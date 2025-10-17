import type { BaseColumnProps } from "../components/core/types";
import { isNullOrUndefined } from "../components/utils/general-utils";

export const INDEX_IDENTIFIER = "_index";

export function getColumnName(column: BaseColumnProps): string {
	if (column.isIndex) {
		return INDEX_IDENTIFIER;
	}
	return isNullOrUndefined(column.name) ? "" : column.name;
}
