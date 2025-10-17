import { DropdownCell as DropdownRenderer } from "@glideapps/glide-data-grid-cells";
import AgeWheelCellRenderer from "../age-wheel-cell";
import ExcalidrawCellRenderer from "../excalidraw-cell";
import PhoneCellRenderer from "../phone-cell-renderer";
import TempusDateCellRenderer from "../tempus-dominus-date-cell";
import TimekeeperCellRenderer from "../timekeeper-cell";

export const customRenderers = [
	DropdownRenderer,
	TempusDateCellRenderer,
	TimekeeperCellRenderer,
	PhoneCellRenderer,
	AgeWheelCellRenderer,
	ExcalidrawCellRenderer,
];
