/* eslint-disable */

import { i18n } from "@shared/libs/i18n";
import { toastService } from "@shared/libs/toast";
import { normalizePhoneForStorage } from "@shared/libs/utils/phone-utils";
import type {
  ApiResponse,
  CalendarEvent,
  OperationResult,
  RowChange,
  SuccessfulOperation,
} from "@/entities/event";
import { reserveTimeSlot } from "@/shared/api";
import { generateLocalOpKeys } from "@/shared/libs/realtime-utils";
import type { FormattingService } from "@/shared/libs/utils/formatting.service";
import type { LocalEchoManager } from "@/shared/libs/utils/local-echo.manager";

export class ReservationCreateService {
  private readonly formattingService: FormattingService;
  private readonly localEchoManager: LocalEchoManager;
  private readonly isLocalized: boolean;

  constructor(
    formattingService: FormattingService,
    localEchoManager: LocalEchoManager,
    isLocalized: boolean
  ) {
    this.formattingService = formattingService;
    this.localEchoManager = localEchoManager;
    this.isLocalized = isLocalized;
  }

  async processAdditions(
    addedRows: RowChange[],
    _onEventAdded?: (event: CalendarEvent) => void
  ): Promise<OperationResult> {
    let hasErrors = false;
    const successful: SuccessfulOperation[] = [];

    for (const row of addedRows || []) {
      const creationData = this.prepareCreationData(row);

      const validation = this.validateCreationData(creationData);
      if (!validation.isValid) {
        this.showValidationError(validation.missing);
        hasErrors = true;
        continue;
      }

      try {
        const slotTime = this.formattingService.normalizeToSlotBase(
          creationData.dStr,
          creationData.tStr
        );

        this.markLocalEchoForCreationPreApi({
          ...creationData,
          tStr: slotTime,
        });

        const resp = (await reserveTimeSlot({
          id: creationData.waId,
          title: creationData.name || creationData.waId,
          date: creationData.dStr,
          time: slotTime,
          type: Number(creationData.type),
          ar: this.isLocalized,
        })) as unknown as ApiResponse;

        if (!resp?.success) {
          throw new Error(this.extractErrorMessage(resp, creationData));
        }

        successful.push({
          type: "create",
          id: creationData.waId,
          data: { date: creationData.dStr, time: slotTime },
        });
      } catch (e) {
        hasErrors = true;
        this.handleCreationError(e as Error, creationData);
      }
    }

    return { hasErrors, successfulOperations: successful };
  }

  private prepareCreationData(row: RowChange) {
    let dStr = "";
    let tStr = "";
    const st = row.scheduled_time as unknown;
    if (st instanceof Date) {
      dStr = this.formattingService.formatDateOnly(st) || "";
      tStr =
        this.formattingService.formatHHmmInZone(st, "Asia/Riyadh") ||
        this.formattingService.formatHHmm(st) ||
        "";
    } else if (typeof st === "string" && st.includes("T")) {
      const dateObj = new Date(st);
      dStr =
        this.formattingService.formatDateOnly(dateObj) ||
        st.split("T")[0] ||
        "";
      tStr =
        this.formattingService.formatHHmmInZone(dateObj, "Asia/Riyadh") ||
        this.formattingService.formatHHmm(dateObj) ||
        "";
    } else {
      dStr =
        this.formattingService.formatDateOnly(
          (row as unknown as { date?: string }).date
        ) || "";
      tStr =
        this.formattingService.formatHHmmInZone(
          (row as unknown as { time?: string }).time,
          "Asia/Riyadh"
        ) ||
        this.formattingService.formatHHmm(
          (row as unknown as { time?: string }).time
        ) ||
        this.formattingService.to24h(
          String((row as unknown as { time?: string }).time || "")
        ) ||
        "";
    }

    const waId = normalizePhoneForStorage((row.phone || "").toString());
    // Minimum phone number length validation
    const MIN_PHONE_LENGTH = 7;
    if (!waId || waId.length < MIN_PHONE_LENGTH) {
      throw new Error("Invalid phone number format");
    }

    const type = this.formattingService.parseType(row.type, this.isLocalized);
    const name = (row.name || "").toString();

    return { dStr, tStr, waId, type, name };
  }

  private validateCreationData(
    data: ReturnType<typeof this.prepareCreationData>
  ) {
    const missing: string[] = [];
    if (!data.waId) {
      missing.push("id/phone");
    }
    if (!data.name) {
      missing.push("name");
    }
    if (!(data.dStr && data.tStr)) {
      missing.push("scheduled_time");
    }
    return { isValid: missing.length === 0, missing };
  }

  private showValidationError(missing: string[]): void {
    // Toast duration in milliseconds
    const TOAST_DURATION_MS = 3000;
    toastService.error(
      i18n.getMessage("missing_required_fields", this.isLocalized),
      i18n.getMessage("please_fill_prefix", this.isLocalized) +
        missing.join(", "),
      TOAST_DURATION_MS
    );
  }

  private extractErrorMessage(
    resp: ApiResponse,
    data: ReturnType<typeof this.prepareCreationData>
  ): string {
    const rawReason =
      (typeof resp?.message === "string" && resp.message) ||
      (typeof (resp as unknown as { error?: string })?.error === "string" &&
        (resp as unknown as { error?: string }).error) ||
      (typeof (resp as unknown as { detail?: string })?.detail === "string" &&
        (resp as unknown as { detail?: string }).detail) ||
      (resp && typeof resp === "object" ? JSON.stringify(resp) : "") ||
      "Unknown";
    const reason = this.localizeReason(rawReason);
    return [
      i18n.getMessage("create_failed_verbose", this.isLocalized),
      `${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
      reason
        ? `${i18n.getMessage("reason_label", this.isLocalized)}: ${reason}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private localizeReason(msg: string): string {
    try {
      const text = String(msg || "");
      const lower = text.toLowerCase();
      if (
        lower.includes("not available") ||
        lower.includes("fully booked") ||
        lower.includes("no available slots")
      ) {
        return i18n.getMessage("slot_fully_booked", this.isLocalized === true);
      }
      return text;
    } catch {
      return String(msg || "");
    }
  }

  private markLocalEchoForCreationPreApi(
    data: ReturnType<typeof this.prepareCreationData>
  ): void {
    const keys = generateLocalOpKeys("reservation_created", {
      id: "",
      wa_id: data.waId,
      date: data.dStr,
      time: data.tStr,
    });
    for (const key of keys) {
      this.localEchoManager.markLocalEcho(key);
    }
  }

  private handleCreationError(
    error: Error,
    data: ReturnType<typeof this.prepareCreationData>
  ): void {
    const base = i18n.getMessage("create_failed", this.isLocalized);
    const msg = this.localizeReason(error?.message || String(error) || "");
    const desc = [
      i18n.getMessage("request_label", this.isLocalized),
      `${data.name || data.waId} • ${data.dStr} ${data.tStr} • type ${Number(data.type)}`,
      msg && `${i18n.getMessage("reason_label", this.isLocalized)}: ${msg}`,
    ]
      .filter(Boolean)
      .join("\n");
    // Toast duration in milliseconds for error messages
    const ERROR_TOAST_DURATION_MS = 6000;
    toastService.error(base, desc, ERROR_TOAST_DURATION_MS);
  }
}
