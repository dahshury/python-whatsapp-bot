import type { DateRestrictions } from "@shared/libs/date/date-restrictions";
import { buildTempusDominusOptions } from "./tempus-dominus.options";
// DOM helpers are consumed by the hook, not needed here
import type {
  TempusDominusFacade,
  TempusFormat,
  TempusTheme,
} from "./tempus-dominus.types";

export class TempusDominusService implements TempusDominusFacade {
  private instance: unknown | null = null;
  private TD:
    | ((input: HTMLElement, opts: Record<string, unknown>) => unknown)
    | null = null;
  private TDNamespace: { events?: Record<string, unknown> } | null = null;
  private DateTimeCtor: (new (d: Date) => unknown) | null = null;

  async init(
    inputElement: HTMLInputElement,
    options: {
      format: TempusFormat;
      restrictions: DateRestrictions;
      theme: TempusTheme;
      locale?: string;
      steppingMinutes?: number;
    }
  ): Promise<void> {
    const TDMod = await import("@eonasdan/tempus-dominus");
    const TempusDominusCtor = TDMod.TempusDominus as unknown as new (
      input: HTMLElement,
      opts: Record<string, unknown>
    ) => unknown;
    this.TD = (inputEl: HTMLElement, opts: Record<string, unknown>) =>
      new TempusDominusCtor(inputEl, opts);
    this.DateTimeCtor =
      (TDMod.DateTime as unknown as { new (d: Date): unknown } | undefined) ??
      null;
    const events = (
      TDMod.Namespace as unknown as { events?: Record<string, unknown> }
    ).events;
    this.TDNamespace = events ? { events } : null;
    const tempusOptions = buildTempusDominusOptions(options);
    (tempusOptions as unknown as { container: HTMLElement }).container =
      document.body;
    this.instance = (
      this.TD as (input: HTMLElement, opts: Record<string, unknown>) => unknown
    )(inputElement, tempusOptions as unknown as Record<string, unknown>);
  }

  show(): void {
    try {
      (this.instance as { show?: () => void } | null)?.show?.();
    } catch {
      // Widget show failed; continue
    }
  }

  hide(): void {
    try {
      (this.instance as { hide?: () => void } | null)?.hide?.();
    } catch {
      // Widget hide failed; continue
    }
  }

  toggle(): void {
    try {
      (this.instance as { toggle?: () => void } | null)?.toggle?.();
    } catch {
      // Widget toggle failed; continue
    }
  }

  setValue(date?: Date): void {
    try {
      if (!date) {
        return;
      }
      const DateTimeCtor = this.DateTimeCtor;
      if (DateTimeCtor) {
        (
          this.instance as {
            dates?: { setValue?: (v: unknown) => void };
          } | null
        )?.dates?.setValue?.(new DateTimeCtor(date));
      }
    } catch {
      // Setting widget value failed; continue
    }
  }

  getPicked(): Date | undefined {
    try {
      const picked: Date[] | undefined = (
        this.instance as { dates?: { picked?: Date[] } } | null
      )?.dates?.picked;
      const d = picked?.[0];
      return d ? new Date(d.valueOf()) : undefined;
    } catch {
      // Getting picked date failed; return undefined
    }
    return;
  }

  subscribe(event: unknown, handler: (e: unknown) => void): () => void {
    try {
      const sub = (
        this.instance as {
          subscribe?: (
            e: unknown,
            h: (e: unknown) => void
          ) => { unsubscribe?: () => void };
        } | null
      )?.subscribe?.(event, handler);
      return () => sub?.unsubscribe?.();
    } catch {
      // Subscription failed; return no-op unsubscriber
    }
    return () => {
      // No-op unsubscriber
    };
  }

  dispose(): void {
    try {
      (this.instance as { dispose?: () => void } | null)?.dispose?.();
    } catch {
      // Widget disposal failed; continue
    }
    this.instance = null;
  }

  getEvents(): Record<string, unknown> | undefined {
    return this.TDNamespace?.events as Record<string, unknown> | undefined;
  }
}
