import {
	type DateRestrictions,
	getDateRestrictions,
} from "@shared/libs/date/date-restrictions";
import { ensureGlobalStyle } from "@shared/libs/dom/style";
import type { VacationPeriod } from "@shared/libs/state/vacation-context";
import { useCallback, useEffect, useRef } from "react";
import {
	animateWidget,
	findOrQueryWidget,
	observeWidgetCreation,
} from "../services/tempus-dominus.dom";
import { TempusDominusService } from "../services/tempus-dominus.service";
import type {
	TempusFormat,
	TempusTheme,
} from "../services/tempus-dominus.types";
import { hideNativeDatePickerCSS } from "../styles/tempus-date-editor.styles";
import {
	getInputValue,
	parseDisplayToDate,
	setInputFromDate,
} from "../utils/date-utils";

export type UseTDWidgetParams = {
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
};

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

	const serviceRef = useRef<TempusDominusService | null>(null);
	const unsubRef = useRef<Array<() => void>>([]);
	const disconnectObserverRef = useRef<(() => void) | null>(null);

	const ensureStyleLoaded = useCallback(() => {
		ensureGlobalStyle("hide-native-date-picker", hideNativeDatePickerCSS);
	}, []);

	// Helpers to reduce init complexity
	const buildRestrictions = useCallback((): DateRestrictions => {
		const restrictions: DateRestrictions = {
			...getDateRestrictions(vacationPeriods, freeRoam, date),
			...(min ? { minDate: min } : {}),
			...(max ? { maxDate: max } : {}),
		};
		return restrictions;
	}, [vacationPeriods, freeRoam, date, min, max]);

	const buildInitOptions = useCallback(
		(tdRestrictions: DateRestrictions) => {
			const initOptions: {
				format: TempusFormat;
				restrictions: DateRestrictions;
				theme: TempusTheme;
				locale?: string;
				steppingMinutes?: number;
			} = {
				format,
				restrictions: tdRestrictions,
				theme,
				...(locale !== undefined ? { locale } : {}),
				...(steppingMinutes !== undefined ? { steppingMinutes } : {}),
			};
			return initOptions;
		},
		[format, theme, locale, steppingMinutes]
	);

	const syncWidgetTheme = useCallback(() => {
		try {
			const widget = findOrQueryWidget(serviceRef.current as unknown);
			if (!widget) {
				return;
			}
			widget.classList.remove("lightTheme", "darkTheme");
			widget.classList.add(theme === "dark" ? "darkTheme" : "lightTheme");
			widget.setAttribute("data-theme", theme);
			const inDialog = !!(
				widget.closest('[role="dialog"]') ||
				widget.closest("[data-radix-dialog-content]")
			);
			if (inDialog) {
				widget.setAttribute("data-dialog-context", "true");
			}
		} catch {
			// Ignore DOM normalization errors
		}
	}, [theme]);

	const seedInitialValue = useCallback(() => {
		const initial = date || parseDisplayToDate(displayDate, format);
		if (!initial) {
			return;
		}
		try {
			serviceRef.current?.setValue(initial);
			setInputFromDate(inputRef.current, initial, format);
		} catch {
			// Ignore initial seeding errors
		}
	}, [date, displayDate, format, inputRef]);

	const handleChangeEvent = useCallback(
		(e: unknown) => {
			try {
				const picked = serviceRef.current?.getPicked();
				if (picked) {
					onChange(picked);
					setInputFromDate(inputRef.current, picked, format);
				} else if ((e as { isClear?: boolean })?.isClear) {
					onChange(undefined);
					if (inputRef.current) {
						inputRef.current.value = "";
					}
				}
			} catch {
				// Ignore change handler errors
			}
		},
		[onChange, format, inputRef]
	);

	const wireEvents = useCallback(() => {
		try {
			const events = serviceRef.current?.getEvents() as
				| Record<string, unknown>
				| undefined;
			const unsubs: Array<() => void> = [];

			const subscribeShow = () => {
				if (!events?.show) {
					return;
				}
				const sub = serviceRef.current?.subscribe(events.show, () => {
					setTimeout(() => {
						const widget = findOrQueryWidget(serviceRef.current as unknown);
						if (widget) {
							animateWidget(widget as HTMLElement, "show");
						}
					}, 0);
				});
				if (sub) {
					unsubs.push(sub);
				}
			};

			const subscribeChange = () => {
				if (!events?.change) {
					return;
				}
				const sub = serviceRef.current?.subscribe(
					events.change,
					(e: unknown) => {
						handleChangeEvent(e);
					}
				);
				if (sub) {
					unsubs.push(sub);
				}
			};

			const subscribeHide = () => {
				if (!events?.hide) {
					return;
				}
				const sub = serviceRef.current?.subscribe(events.hide, () => {
					try {
						const widget = findOrQueryWidget(serviceRef.current as unknown);
						if (widget) {
							animateWidget(widget as HTMLElement, "hide");
						}
					} catch {
						// Ignore animation errors
					}
					onFinished?.();
				});
				if (sub) {
					unsubs.push(sub);
				}
			};

			subscribeShow();
			subscribeChange();
			subscribeHide();
			unsubRef.current = unsubs;
		} catch {
			// Ignore event wiring errors
		}
	}, [handleChangeEvent, onFinished]);

	const observeAndAnimate = useCallback(() => {
		disconnectObserverRef.current = observeWidgetCreation((widget) => {
			animateWidget(widget, "show");
		});
	}, []);

	const initIfNeeded = useCallback(async () => {
		if (!inputRef.current) {
			return;
		}
		if (!serviceRef.current) {
			serviceRef.current = new TempusDominusService();
		}
		const restrictions = buildRestrictions();
		const initOpts = buildInitOptions(restrictions);
		await serviceRef.current.init(inputRef.current, initOpts);

		// After init, immediately sync the widget's theme classes and dialog context
		syncWidgetTheme();

		// Seed initial value to widget and input if we have date/displayDate
		seedInitialValue();

		// Wire events once
		wireEvents();

		// Observe widget creation to mark safe and animate on-first paint
		observeAndAnimate();
	}, [
		inputRef,
		buildRestrictions,
		buildInitOptions,
		syncWidgetTheme,
		seedInitialValue,
		wireEvents,
		observeAndAnimate,
	]);

	const handleIconClick = useCallback(
		async (e: React.MouseEvent<HTMLElement>) => {
			e.preventDefault();
			e.stopPropagation();
			const native = e.nativeEvent as { stopImmediatePropagation?: () => void };
			if (native?.stopImmediatePropagation) {
				native.stopImmediatePropagation();
			}
			await initIfNeeded();
			serviceRef.current?.toggle();
		},
		[initIfNeeded]
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value;
			if (value == null || value.trim() === "") {
				return;
			}
			const parsed =
				parseDisplayToDate(value, format) ??
				(Number.isNaN(Date.parse(value))
					? undefined
					: new Date(Date.parse(value)));
			if (parsed && !Number.isNaN(parsed.getTime())) {
				onChange(parsed);
			}
		},
		[format, onChange]
	);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const next = e.relatedTarget as HTMLElement | null;
			const widgetOpen = !!document.querySelector(
				".tempus-dominus-widget.tempus-dominus-widget-visible"
			);
			if (
				widgetOpen ||
				(next &&
					(wrapperRef.current?.contains(next) ||
						next.closest(".tempus-dominus-widget")))
			) {
				return;
			}
			const inputValue = e.currentTarget.value;
			if (inputValue) {
				const parsed = parseDisplayToDate(inputValue, format);
				if (parsed) {
					onChange(parsed);
				}
			}
			onFinished?.();
		},
		[format, onChange, onFinished, wrapperRef]
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				const inputValue = inputRef.current?.value;
				if (inputValue) {
					const parsed = parseDisplayToDate(inputValue, format);
					if (parsed) {
						onChange(parsed);
					}
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

	useEffect(() => {
		return () => {
			try {
				for (const u of unsubRef.current) {
					u();
				}
			} catch {
				// Ignore unsubscribe errors
			}
			try {
				disconnectObserverRef.current?.();
			} catch {
				// Ignore observer disconnect errors
			}
			try {
				serviceRef.current?.dispose();
			} catch {
				// Ignore dispose errors
			}
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
