import type { Theme } from "@glideapps/glide-data-grid";
import type { IColumnDefinition } from "@/shared/libs/data-grid/components/core/interfaces/i-data-source";

export type ColumnSchemaOptions = {
	localized?: boolean;
	// Allow additional contextual options without strict typing
	[key: string]: unknown;
	/** Optional per-cellType theme overrides, e.g., date/time/name */
	themeByCellType?: Record<string, Partial<Theme>>;
	/** Optional per-column-id theme overrides */
	themeById?: Record<string, Partial<Theme>>;
};

export type ColumnSchema = {
	key: string;
	getColumns: (options?: ColumnSchemaOptions) => IColumnDefinition[];
};

export type ColumnPresetFactory = (
	overrides?: Partial<IColumnDefinition>
) => IColumnDefinition;
