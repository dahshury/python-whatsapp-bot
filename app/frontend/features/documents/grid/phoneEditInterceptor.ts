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
  // Optional: mutation hook for updating name when phone is edited and both exist
  updateNameMutation?: {
    mutate: (params: {
      waId: string;
      name: string;
      isLocalized?: boolean;
    }) => void;
  };
  // Optional: current waId to check if we're staying on the same customer
  currentWaId?: string;
  // Optional: data source and columns for checking if both name and phone exist
  customerDataSource?: unknown;
  customerColumns?: Array<{ id?: string }>;
  isLocalized?: boolean;
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
  const {
    findCustomerByPhone,
    dispatch,
    documentsMode,
    onCustomerSelected,
    updateNameMutation,
    currentWaId,
    customerDataSource,
    customerColumns,
    isLocalized,
  } = deps;

  return function phoneEditInterceptor(ctx: EditInterceptorContext) {
    console.log("[PHONE INTERCEPTOR] Started", {
      currentWaId,
      documentsMode,
      cell: ctx.cell,
    });

    try {
      const suppressionCounter = (
        globalThis as {
          __docSuppressPhoneSelect?: number;
        }
      ).__docSuppressPhoneSelect;
      if (typeof suppressionCounter === "number" && suppressionCounter > 0) {
        console.log("[PHONE INTERCEPTOR] Suppressed by counter", suppressionCounter);
        return false;
      }
    } catch {
      // Ignore suppression lookup failures and continue normally
    }
    const [displayCol, displayRow] = ctx.cell;
    const actualRow = ctx.visibleRows?.[displayRow] ?? displayRow;
    if (actualRow === undefined) {
      console.log("[PHONE INTERCEPTOR] No actual row found");
      return false;
    }

    const displayColumns = Array.isArray(ctx.extras?.displayColumns)
      ? (ctx.extras.displayColumns as Array<{ id?: string; name?: string }>)
      : [];
    const columnId = getColumnId(displayColumns, displayCol);
    if (columnId !== "phone") {
      console.log("[PHONE INTERCEPTOR] Not phone column:", columnId);
      return false;
    }

    const phoneCell = ctx.newValue as {
      data?: { kind?: string; value?: string };
    };
    if (phoneCell?.data?.kind !== "phone-cell") {
      console.log("[PHONE INTERCEPTOR] Not phone-cell kind:", phoneCell?.data?.kind);
      return false;
    }

    const rawPhone = phoneCell.data?.value ?? "";
    if (!isString(rawPhone) || rawPhone.trim() === "") {
      console.log("[PHONE INTERCEPTOR] Empty phone value");
      return false;
    }

    console.log("[PHONE INTERCEPTOR] Phone entered:", rawPhone);

    const customer = findCustomerByPhone(rawPhone);
    if (!customer) {
      console.log("[PHONE INTERCEPTOR] No existing customer found for phone:", rawPhone);
      console.log("[PHONE INTERCEPTOR] This is a NEW customer - triggering unlock validation");
      
      // For new customers, still trigger unlock validation after a delay
      // This allows the document to unlock once both name and phone are filled
      setTimeout(() => {
        try {
          window.dispatchEvent(
            new CustomEvent("doc:unlock-request", {
              detail: { waId: rawPhone },
            })
          );
          console.log("[PHONE INTERCEPTOR] ✓ Dispatched doc:unlock-request for NEW customer");
        } catch (error) {
          console.error("[PHONE INTERCEPTOR] Failed to dispatch doc:unlock-request:", error);
        }
      }, 50);
      
      return false;
    }

    console.log("[PHONE INTERCEPTOR] Existing customer found:", {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
    });

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
            console.log("[PHONE INTERCEPTOR] Autofilling name:", desiredName, {
              nameCol: actualNameCol,
              row: actualRow,
            });
            try {
              dataProvider.setCell(
                actualNameCol,
                actualRow,
                toTextCell(desiredName)
              );
              console.log("[PHONE INTERCEPTOR] Name cell updated successfully");
              
              // Force grid to refresh the name cell after programmatic update
              try {
                const gridApi = (
                  window as unknown as {
                    __docGridApi?: { updateCells?: (cells: { cell: [number, number] }[]) => void };
                  }
                ).__docGridApi;
                if (gridApi?.updateCells) {
                  gridApi.updateCells([{ cell: [actualNameCol, actualRow] }]);
                  console.log("[PHONE INTERCEPTOR] Grid cells refreshed");
                }
              } catch {
                /* ignore grid update errors */
              }
            } catch (error) {
              console.error("[PHONE INTERCEPTOR] Failed to set name cell:", error);
            }
          } else {
            console.log("[PHONE INTERCEPTOR] Name already matches, skipping update");
          }
        }
      }
    }

    const waId = customer.id || rawPhone;

    // Check if we're staying on the same customer (not switching) and both name and phone exist
    // If so, trigger name mutation (phone can't be updated via API)
    if (
      documentsMode &&
      updateNameMutation &&
      customerDataSource &&
      customerColumns &&
      currentWaId &&
      waId === currentWaId // Only trigger if staying on the same customer
    ) {
      // Check if both name and phone exist asynchronously
      const nameCol = customerColumns.findIndex((c) => c.id === "name");
      const phoneCol = customerColumns.findIndex((c) => c.id === "phone");
      if (nameCol !== -1 && phoneCol !== -1) {
        Promise.all([
          (
            customerDataSource as {
              getCellData?: (col: number, row: number) => Promise<unknown>;
            }
          ).getCellData?.(nameCol, 0) ?? Promise.resolve(""),
          (
            customerDataSource as {
              getCellData?: (col: number, row: number) => Promise<unknown>;
            }
          ).getCellData?.(phoneCol, 0) ?? Promise.resolve(""),
        ])
          .then(([nameVal, phoneVal]) => {
            const nameOk =
              typeof nameVal === "string" && nameVal.trim().length > 0;
            const phoneOk =
              typeof phoneVal === "string" && phoneVal.trim().length > 0;

            // Only trigger mutation if both name and phone exist
            if (nameOk && phoneOk && typeof nameVal === "string") {
              updateNameMutation.mutate({
                waId,
                name: nameVal.trim(),
                ...(isLocalized !== undefined ? { isLocalized } : {}),
              });
            }
          })
          .catch(() => {
            // Silently ignore errors
          });
      }
    }

    console.log("[PHONE INTERCEPTOR] Dispatching events for waId:", waId);

    if (dispatch) {
      try {
        dispatch("doc:user-select", { waId });
        console.log("[PHONE INTERCEPTOR] ✓ Dispatched doc:user-select");
      } catch {
        /* noop */
      }
      if (documentsMode) {
        try {
          dispatch("doc:notify", { field: "phone", waId });
          console.log("[PHONE INTERCEPTOR] ✓ Dispatched doc:notify (phone)");
        } catch {
          /* noop */
        }
        try {
          dispatch("doc:persist", { field: "phone", waId });
          console.log("[PHONE INTERCEPTOR] ✓ Dispatched doc:persist (phone)");
        } catch {
          /* noop */
        }
        if ((customer.name ?? "").trim()) {
          try {
            dispatch("doc:persist", { field: "name", waId });
            console.log("[PHONE INTERCEPTOR] ✓ Dispatched doc:persist (name)");
          } catch {
            /* noop */
          }
        }
      }
    }

    // Trigger unlock validation after autofilling name and phone
    // Use setTimeout to ensure grid/provider has fully processed the cell updates
    console.log("[PHONE INTERCEPTOR] Scheduling doc:unlock-request in 50ms");
    setTimeout(() => {
      try {
        window.dispatchEvent(
          new CustomEvent("doc:unlock-request", {
            detail: { waId },
          })
        );
        console.log("[PHONE INTERCEPTOR] ✓ Dispatched doc:unlock-request for waId:", waId);
      } catch (error) {
        console.error("[PHONE INTERCEPTOR] Failed to dispatch doc:unlock-request:", error);
      }
    }, 50);

    if (documentsMode && typeof onCustomerSelected === "function") {
      try {
        onCustomerSelected(waId);
        console.log("[PHONE INTERCEPTOR] ✓ Called onCustomerSelected");
      } catch {
        /* noop */
      }
      return true;
    }

    console.log("[PHONE INTERCEPTOR] Completed successfully");
    return true;
  };
}
