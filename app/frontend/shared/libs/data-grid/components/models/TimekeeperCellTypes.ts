import type { CustomCell } from "@glideapps/glide-data-grid";

export type TimekeeperCellProps = {
  readonly kind: "timekeeper-cell";
  readonly time?: Date;
  readonly displayTime?: string;
  readonly readonly?: boolean;
  readonly isDarkTheme?: boolean;
  readonly use24Hour?: boolean;
  readonly selectedDate?: Date; // Date from first column for time restrictions
};

export type TimekeeperCell = CustomCell<TimekeeperCellProps>;

export type TimePickerPosition = {
  top: number;
  left: number;
};

export type TimeKeeperData = {
  formatted12?: string;
  formatted24?: string;
  time?: string;
};
