export * from "./TextColumnType";
export * from "./NumberColumnType";
export * from "./DateColumnType";
export * from "./TimeColumnType";
export * from "./DropdownColumnType";
export * from "./PhoneColumnType";

import { ColumnTypeRegistry } from "../services/ColumnTypeRegistry";
import { TextColumnType } from "./TextColumnType";
import { NumberColumnType } from "./NumberColumnType";
import { DateColumnType } from "./DateColumnType";
import { TimeColumnType } from "./TimeColumnType";
import { DropdownColumnType } from "./DropdownColumnType";
import { PhoneColumnType } from "./PhoneColumnType";
import { EmailColumnType } from "./EmailColumnType";

export function registerDefaultColumnTypes(): void {
  const registry = ColumnTypeRegistry.getInstance();
  
  registry.register(new TextColumnType());
  registry.register(new NumberColumnType());
  registry.register(new DateColumnType());
  registry.register(new TimeColumnType());
  registry.register(new DropdownColumnType());
  registry.register(new PhoneColumnType());
  registry.register(new EmailColumnType());
} 