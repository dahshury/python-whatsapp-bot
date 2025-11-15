// Public API for data-table services

export {
  type CustomerWaIdModifierDependencies,
  createCustomerWaIdModifier,
} from "./customer-waid-modifier.service";
export {
  extractCancellationDataForGrid,
  extractCreationData,
  extractModificationData,
  type ModificationPayload,
} from "./data-table-change.extractors";
export { createDataTableSaveService } from "./data-table-save.service";
export type {
  DataTableSaveDependencies,
  DataTableSaveMutations,
  EditingChangesPayload,
} from "./data-table-save.types";
