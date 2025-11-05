import { GridCellKind } from "@glideapps/glide-data-grid";
import type {
  EditInterceptor,
  EditInterceptorContext,
} from "@shared/libs/data-grid/core/services/runEditPipeline";

export type CustomerLike = {
  id: string;
  phone?: string;
  name?: string;
};

export type PhoneEditDeps = {
  findCustomerByPhone: (phone: string) => CustomerLike | undefined;
  dispatch?: (
    type:
      | "doc:user-select"
      | "doc:customer-loaded"
      | "grid:age-request"
      | "doc:persist"
      | "doc:notify",
    detail: unknown
  ) => void;
  documentsMode?: boolean;
  onCustomerSelected?: (waId: string) => void;
};

const isString = (value: unknown): value is string => typeof value === "string";

const getColumnId = (
  columns: Array<{ id?: string; name?: string }>,
  index: number
): string | undefined => {
  const col = columns[index];
  if (!col) {
    return;
  }
  return col.id ?? col.name ?? undefined;
};

const toTextCell = (value: string) => ({
  kind: GridCellKind.Text,
  data: value,
  displayData: value,
  allowOverlay: true,
});

export function createPhoneEditInterceptor(
  deps: PhoneEditDeps
): EditInterceptor {
  const { findCustomerByPhone, dispatch, documentsMode, onCustomerSelected } =
    deps;

  return function phoneEditInterceptor(ctx: EditInterceptorContext) {
    try {
      const suppressionCounter = (
        globalThis as {
          __docSuppressPhoneSelect?: number;
        }
      ).__docSuppressPhoneSelect;
      if (typeof suppressionCounter === "number" && suppressionCounter > 0) {
        return false;
      }
    } catch {
      // Ignore suppression lookup failures and continue normally
    }
    const [displayCol, displayRow] = ctx.cell;
    const actualRow = ctx.visibleRows?.[displayRow] ?? displayRow;
    if (actualRow === undefined) {
      return false;
    }

    const displayColumns = Array.isArray(ctx.extras?.displayColumns)
      ? (ctx.extras.displayColumns as Array<{ id?: string; name?: string }>)
      : [];
    const columnId = getColumnId(displayColumns, displayCol);
    if (columnId !== "phone") {
      return false;
    }

    const phoneCell = ctx.newValue as {
      data?: { kind?: string; value?: string };
    };
    if (phoneCell?.data?.kind !== "phone-cell") {
      return false;
    }

    const rawPhone = phoneCell.data?.value ?? "";
    if (!isString(rawPhone) || rawPhone.trim() === "") {
      return false;
    }

    const customer = findCustomerByPhone(rawPhone);
    if (!customer) {
      return false;
    }

    const dataProvider = ctx.extras?.dataProvider as
      | {
          setCell?: (col: number, row: number, cell: unknown) => void;
          getCell?: (col: number, row: number) => unknown;
        }
      | undefined;

    const nameDisplayIndex = displayColumns.findIndex((col) => {
      const identifier = col?.id ?? col?.name;
      return identifier === "name";
    });

    if (
      nameDisplayIndex >= 0 &&
      dataProvider &&
      typeof dataProvider.setCell === "function"
    ) {
      const actualNameCol =
        ctx.visibleColumns?.[nameDisplayIndex] ?? nameDisplayIndex;
      if (actualNameCol !== undefined) {
        const desiredName = (customer.name ?? "").trim();
        if (desiredName) {
          let shouldUpdate = true;
          if (typeof dataProvider.getCell === "function") {
            try {
              const existing = dataProvider.getCell(
                actualNameCol,
                actualRow
              ) as { data?: unknown };
              if (isString(existing?.data)) {
                shouldUpdate = existing.data !== desiredName;
              }
            } catch {
              shouldUpdate = true;
            }
          }
          if (shouldUpdate) {
            try {
              dataProvider.setCell(
                actualNameCol,
                actualRow,
                toTextCell(desiredName)
              );
            } catch {
              /* ignore cell update errors */
            }
          }
        }
      }
    }

    const waId = customer.id || rawPhone;

    if (documentsMode && typeof onCustomerSelected === "function") {
      try {
        onCustomerSelected(waId);
      } catch {
        /* noop */
      }
      return true;
    }

    if (dispatch) {
      try {
        dispatch("doc:user-select", { waId });
      } catch {
        /* noop */
      }
      if (documentsMode) {
        try {
          dispatch("doc:notify", { field: "phone", waId });
        } catch {
          /* noop */
        }
        try {
          dispatch("doc:persist", { field: "phone", waId });
        } catch {
          /* noop */
        }
        if ((customer.name ?? "").trim()) {
          try {
            dispatch("doc:persist", { field: "name", waId });
          } catch {
            /* noop */
          }
        }
      }
    }

    return true;
  };
}
