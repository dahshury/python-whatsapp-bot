export * from "./DateColumnType";
export * from "./DateTimeColumnType";
export * from "./DropdownColumnType";
export * from "./NumberColumnType";
export * from "./PhoneColumnType";

export * from "./TextColumnType";
export * from "./TimeColumnType";

import { ColumnTypeRegistry } from "../services/ColumnTypeRegistry";
import { DateColumnType } from "./DateColumnType";
import { DateTimeColumnType } from "./DateTimeColumnType";
import { DropdownColumnType } from "./DropdownColumnType";
import { EmailColumnType } from "./EmailColumnType";
import { NumberColumnType } from "./NumberColumnType";
import { PhoneColumnType } from "./PhoneColumnType";

import { TextColumnType } from "./TextColumnType";
import { TimeColumnType } from "./TimeColumnType";

export function registerDefaultColumnTypes(): void {
  const registry = ColumnTypeRegistry.getInstance();

  registry.register(new TextColumnType());
  registry.register(new NumberColumnType());
  registry.register(new DateColumnType());
  registry.register(new TimeColumnType());
  registry.register(new DateTimeColumnType());
  registry.register(new DropdownColumnType());
  registry.register(new PhoneColumnType());

  registry.register(new EmailColumnType());
}
