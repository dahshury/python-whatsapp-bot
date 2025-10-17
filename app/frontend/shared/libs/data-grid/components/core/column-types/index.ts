import { ColumnTypeRegistry } from "../services/column-type-registry";
import { DateColumnType } from "./date-column-type";
import { DateTimeColumnType } from "./date-time-column-type";
import { DropdownColumnType } from "./dropdown-column-type";
import { EmailColumnType } from "./email-column-type";
import { ExcalidrawColumnType } from "./excalidraw-column-type";
import { NumberColumnType } from "./number-column-type";
import { PhoneColumnType } from "./phone-column-type";
import { TextColumnType } from "./text-column-type";
import { TimeColumnType } from "./time-column-type";

export function registerDefaultColumnTypes(): void {
	const registry = ColumnTypeRegistry.getInstance();

	registry.register(new TextColumnType());
	registry.register(new NumberColumnType());
	registry.register(new DateColumnType());
	registry.register(new TimeColumnType());
	registry.register(new DateTimeColumnType());
	registry.register(new DropdownColumnType());
	registry.register(new PhoneColumnType());
	registry.register(new ExcalidrawColumnType());

	registry.register(new EmailColumnType());
}
