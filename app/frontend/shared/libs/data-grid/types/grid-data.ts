// Core types for data-grid shared library

export type FormatterKey =
  | "automatic"
  | "localized"
  | "plain"
  | "compact"
  | "dollar"
  | "euro"
  | "yen"
  | "percent"
  | "percentage"
  | "scientific"
  | "currency"
  | "accounting";

export type ValidationResult = {
  isValid: boolean;
  code?: string;
  correctedValue?: string;
};

export type ValidatorFn<T = unknown> = (value: T) => ValidationResult;

export type ColumnKind =
  | "text"
  | "dropdown"
  | "number"
  | "date"
  | "time"
  | "datetime"
  | "boolean"
  | "custom";

export type GridColumnConfig = {
  id: string;
  kind: ColumnKind;
  /** Optional preset key for number/date/time formatting */
  formatKey?: FormatterKey | string;
  /** Optional validator registry key */
  validatorKey?: string;
  /** For dropdown columns */
  allowedValues?: string[];
  /** For time columns */
  use24Hour?: boolean;
};
