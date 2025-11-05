import type { GridColumn } from "@glideapps/glide-data-grid";
import type { ColumnConfig } from "../core/types/grid";
import type { BaseColumnProps } from "./core/types";
import { useColumnMenuPinning } from "./hooks/useColumnMenuPinning";
import { ColumnMenu } from "./menus/ColumnMenu";

type GridColumnMenuProps = {
  columnMenu: {
    menuState: {
      column: BaseColumnProps | null;
      isOpen: boolean;
      position: { x: number; y: number };
    };
    changeFormat: (columnId: string, format: string) => void;
    closeMenu: () => void;
  };
  columnConfigMapping: Map<string, ColumnConfig>;
  displayColumns: GridColumn[];
  isDarkMode: boolean;
  isUsingExternalTheme: boolean;
  theme: unknown;
  darkTheme: unknown;
  handleAutosize: (columnId: string) => void;
  handleHide: (columnId: string) => void;
  handlePin: (columnId: string, side: "left" | "right") => void;
  handleSort: (columnId: string, dir: "asc" | "desc") => void;
  handleUnpin: (columnId: string) => void;
  sortState: {
    columnId: string;
    direction: "asc" | "desc";
  } | null;
};

export function GridColumnMenu({
  columnMenu,
  columnConfigMapping,
  displayColumns,
  isDarkMode,
  isUsingExternalTheme,
  theme,
  darkTheme,
  handleAutosize,
  handleHide,
  handlePin,
  handleSort,
  handleUnpin,
  sortState,
}: GridColumnMenuProps) {
  const isMenuPinned = useColumnMenuPinning({
    columnId: columnMenu.menuState.column?.id,
    columnConfigMapping,
    displayColumns,
  });

  if (!(columnMenu.menuState.isOpen && columnMenu.menuState.column)) {
    return null;
  }

  const column = columnMenu.menuState.column;

  return (
    <ColumnMenu
      column={column}
      isDarkTheme={isUsingExternalTheme ? isDarkMode : theme === darkTheme}
      isPinned={isMenuPinned}
      onAutosize={handleAutosize}
      onChangeFormat={columnMenu.changeFormat}
      onClose={columnMenu.closeMenu}
      onHide={handleHide}
      onPin={handlePin}
      onSort={handleSort}
      onUnpin={handleUnpin}
      position={columnMenu.menuState.position}
      sortDirection={
        sortState?.columnId === column.id && sortState?.direction
          ? sortState.direction
          : null
      }
    />
  );
}
