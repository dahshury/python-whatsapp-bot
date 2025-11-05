import type {
  GridColumnConfig,
  ValidationResult,
  ValidatorFn,
} from "../../types/grid-data";

export type ValidatorRegistry = Record<string, ValidatorFn>;

export class ValidationService {
  private readonly registry: ValidatorRegistry;
  private readonly columnConfigsById: Map<string, GridColumnConfig>;

  constructor(registry: ValidatorRegistry, columnConfigs: GridColumnConfig[]) {
    this.registry = registry;
    this.columnConfigsById = new Map(columnConfigs.map((c) => [c.id, c]));
  }

  validate(columnId: string | undefined, value: unknown): ValidationResult {
    if (!columnId) {
      return { isValid: true };
    }

    const columnConfig = this.columnConfigsById.get(columnId);
    const validatorKey = columnConfig?.validatorKey;

    if (!validatorKey) {
      return { isValid: true };
    }

    const validator = this.registry[validatorKey];
    if (!validator) {
      return { isValid: true };
    }

    return validator(value);
  }
}
