import { type DateRestrictions, getDateRestrictions } from "@shared/libs/date/date-restrictions";
import { ensureGlobalStyle } from "@shared/libs/dom/style";
import type { VacationPeriod } from "@shared/libs/state/vacation-context";
import * as React from "react";
import { animateWidget, findOrQueryWidget, observeWidgetCreation } from "../services/tempus-dominus.dom";
import { TempusDominusService } from "../services/tempus-dominus.service";
import type { TempusFormat, TempusTheme } from "../services/tempus-dominus.types";
import { hideNativeDatePickerCSS } from "../styles/tempus-date-editor.styles";
import { getInputValue, parseDisplayToDate, setInputFromDate } from "../utils/date-utils";

export interface UseTDWidgetParams {
	inputRef: React.RefObject<HTMLInputElement | null>;
	wrapperRef: React.RefObject<HTMLElement | null>;
	format: TempusFormat;
	theme: TempusTheme;
	vacationPeriods: VacationPeriod[];
	freeRoam: boolean;
	min?: Date;
	max?: Date;
	date?: Date;
	displayDate?: string;
	locale?: string;
	steppingMinutes?: number;
	onChange: (date?: Date) => void;
	onFinished?: () => void;
}

export function useTempusDominusWidget(opts: UseTDWidgetParams) {
	const {
		inputRef,
		wrapperRef,
		format,
		theme,
		vacationPeriods,
		freeRoam,
		min,
		max,
		date,
		displayDate,
		locale,
		steppingMinutes,
		onChange,
		onFinished,
	} = opts;

	const serviceRef = React.useRef<TempusDominusService | null>(null);
	const unsubRef = React.useRef<Array<() => void>>([]);
	const disconnectObserverRef = React.useRef<(() => void) | null>(null);

	const ensureStyleLoaded = React.useCallback(() => {
		ensureGlobalStyle("hide-native-date-picker", hideNativeDatePickerCSS);
	}, []);

	const initIfNeeded = React.useCallback(async () => {
		if (!inputRef.current) return;
		if (!serviceRef.current) serviceRef.current = new TempusDominusService();
		const restrictions: DateRestrictions = {
			...getDateRestrictions(vacationPeriods, freeRoam, date),
			...(min ? { minDate: min } : {}),
			...(max ? { maxDate: max } : {}),
		};
		const initOpts: {
			format: TempusFormat;
			restrictions: DateRestrictions;
			theme: TempusTheme;
			locale?: string;
			steppingMinutes?: number;
		} = {
			format,
			restrictions,
			theme,
			...(locale !== undefined ? { locale } : {}),
			...(steppingMinutes !== undefined ? { steppingMinutes } : {}),
		};
		await serviceRef.current.init(inputRef.current, initOpts);

		// After init, immediately sync the widget's theme classes and dialog context
		try {
			const widget = findOrQueryWidget(serviceRef.current as unknown);
			if (widget) {
				// Normalize theme classes/attributes used by our CSS
				widget.classList.remove("lightTheme", "darkTheme");
				widget.classList.add(theme === "dark" ? "darkTheme" : "lightTheme");
				widget.setAttribute("data-theme", theme);
				// If the picker is within a dialog, hint CSS to prefer dialog z-index layer
				const inDialog = !!(widget.closest('[role="dialog"]') || widget.closest("[data-radix-dialog-content]"));
				if (inDialog) widget.setAttribute("data-dialog-context", "true");
			}
		} catch {}

		// Seed initial value to widget and input if we have date/displayDate
		const initial = date || parseDisplayToDate(displayDate, format);
		if (initial) {
			try {
				serviceRef.current.setValue(initial);
				setInputFromDate(inputRef.current, initial, format);
			} catch {}
		}

		// Wire events once
		try {
			const events = serviceRef.current.getEvents() as Record<string, unknown> | undefined;
			const unsubs: Array<() => void> = [];
			if (events?.show) {
				unsubs.push(
					serviceRef.current.subscribe(events.show, () => {
						setTimeout(() => {
							const widget = findOrQueryWidget(serviceRef.current as unknown);
							if (widget) animateWidget(widget as HTMLElement, "show");
						}, 0);
					})
				);
			}
			if (events?.change) {
				unsubs.push(
					serviceRef.current.subscribe(events.change, (e: unknown) => {
						try {
							const picked = serviceRef.current?.getPicked();
							if (picked) {
								onChange(picked);
								setInputFromDate(inputRef.current, picked, format);
							} else if ((e as { isClear?: boolean })?.isClear) {
								onChange(undefined);
								if (inputRef.current) inputRef.current.value = "";
							}
						} catch {}
					})
				);
			}
			if (events?.hide) {
				unsubs.push(
					serviceRef.current.subscribe(events.hide, () => {
						try {
							const widget = findOrQueryWidget(serviceRef.current as unknown);
							if (widget) animateWidget(widget as HTMLElement, "hide");
						} catch {}
						onFinished?.();
					})
				);
			}
			unsubRef.current = unsubs;
		} catch {}

		// Observe widget creation to mark safe and animate on-first paint
		disconnectObserverRef.current = observeWidgetCreation((widget) => {
			animateWidget(widget, "show");
		});
	}, [
		inputRef,
		vacationPeriods,
		freeRoam,
		date,
		min,
		max,
		format,
		theme,
		locale,
		steppingMinutes,
		onChange,
		onFinished,
		displayDate,
	]);

	const handleIconClick = React.useCallback(
		async (e: React.MouseEvent<HTMLElement>) => {
			e.preventDefault();
			e.stopPropagation();
			const native = e.nativeEvent as { stopImmediatePropagation?: () => void };
			if (native?.stopImmediatePropagation) native.stopImmediatePropagation();
			await initIfNeeded();
			serviceRef.current?.toggle();
		},
		[initIfNeeded]
	);

	const handleChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			if (value == null || value.trim() === "") return;
			const parsed =
				parseDisplayToDate(value, format) ??
				(!Number.isNaN(Date.parse(value)) ? new Date(Date.parse(value)) : undefined);
			if (parsed && !Number.isNaN(parsed.getTime())) {
				onChange(parsed);
			}
		},
		[format, onChange]
	);

	const handleBlur = React.useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const next = e.relatedTarget as HTMLElement | null;
			const widgetOpen = !!document.querySelector(".tempus-dominus-widget.tempus-dominus-widget-visible");
			if (widgetOpen || (next && (wrapperRef.current?.contains(next) || next.closest(".tempus-dominus-widget")))) {
				return;
			}
			const inputValue = e.currentTarget.value;
			if (inputValue) {
				const parsed = parseDisplayToDate(inputValue, format);
				if (parsed) onChange(parsed);
			}
			onFinished?.();
		},
		[format, onChange, onFinished, wrapperRef]
	);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				const inputValue = inputRef.current?.value;
				if (inputValue) {
					const parsed = parseDisplayToDate(inputValue, format);
					if (parsed) onChange(parsed);
				}
				onFinished?.();
			} else if (e.key === "Escape") {
				e.preventDefault();
				if (inputRef.current) {
					inputRef.current.value = getInputValue(date, format, displayDate);
				}
				onFinished?.();
			}
		},
		[inputRef, format, onChange, onFinished, date, displayDate]
	);

	React.useEffect(() => {
		return () => {
			try {
				for (const u of unsubRef.current) u();
			} catch {}
			try {
				disconnectObserverRef.current?.();
			} catch {}
			try {
				serviceRef.current?.dispose();
			} catch {}
		};
	}, []);

	return {
		ensureStyleLoaded,
		handleIconClick,
		handleChange,
		handleBlur,
		handleKeyDown,
	};
}
