import type { GridColumn } from "@glideapps/glide-data-grid";
import { useCallback } from "react";
import type { BaseColumnProps } from "../components/core/types";

type ColumnMenuApi = {
	openMenu: (column: BaseColumnProps, x: number, y: number) => void;
};

const DEFAULT_MENU_WIDTH = 220;
const DEFAULT_COLUMN_WIDTH = 150;

export function useHeaderMenuClick({
	columnMenu,
	menuWidth = DEFAULT_MENU_WIDTH,
}: {
	columnMenu: ColumnMenuApi;
	menuWidth?: number;
}) {
	return useCallback(
		(
			column: GridColumn,
			bounds: { x: number; y: number; width: number; height: number }
		) => {
			if (!column) {
				return;
			}
			columnMenu.openMenu(
				{
					id: (column as { id?: string }).id as string,
					name: (column as { id?: string }).id as string,
					title: (column as { title?: string }).title as string,
					width: ((column as { width?: number }).width ??
						DEFAULT_COLUMN_WIDTH) as number,
					isEditable: Boolean((column as { isEditable?: boolean }).isEditable),
					isHidden: Boolean((column as { isHidden?: boolean }).isHidden),
					isPinned: false,
					isRequired: Boolean((column as { isRequired?: boolean }).isRequired),
					isIndex: false,
					indexNumber: 0,
				} as BaseColumnProps,
				bounds.x + bounds.width - menuWidth,
				bounds.y + bounds.height
			);
		},
		[columnMenu, menuWidth]
	);
}
