import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import * as React from "react";
import {
	formatForTempusDominus,
	getDateRestrictions,
} from "../../../lib/date-restrictions";
import { useVacation } from "../../../lib/vacation-context";

interface TempusDateCellProps {
	readonly kind: "tempus-date-cell";
	readonly date?: Date;
	readonly format?: "date" | "datetime" | "time";
	readonly displayDate?: string;
	readonly readonly?: boolean;
	readonly min?: Date;
	readonly max?: Date;
	readonly isDarkTheme?: boolean;
	readonly freeRoam?: boolean;
}

export type TempusDateCell = CustomCell<TempusDateCellProps>;

const editorStyle: React.CSSProperties = {
	width: "100%",
	height: "100%",
	border: "none",
	outline: "none",
	padding: "8px",
	paddingRight: "36px",
	fontSize: "13px",
	fontFamily: "inherit",
	backgroundColor: "transparent",
	color: "inherit",
};

const wrapperStyle: React.CSSProperties = {
	display: "flex",
	alignItems: "center",
	width: "100%",
	height: "100%",
	position: "relative",
};

const iconButtonStyle: React.CSSProperties = {
	position: "absolute",
	right: "8px",
	top: "50%",
	transform: "translateY(-50%)",
	background: "none",
	border: "none",
	cursor: "pointer",
	padding: "4px",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	color: "inherit",
	opacity: 0.7,
	transition: "opacity 0.2s",
	width: "24px",
	height: "24px",
	borderRadius: "4px",
};

// CSS to hide native date picker controls
const hideNativeDatePickerCSS = `
  /* Chrome, Safari, Edge, Opera */
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator,
  input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    display: none;
    -webkit-appearance: none;
  }
  
  /* Firefox */
  input[type="date"]::-moz-calendar-picker-indicator,
  input[type="time"]::-moz-calendar-picker-indicator,
  input[type="datetime-local"]::-moz-calendar-picker-indicator {
    display: none;
  }
  
  /* Remove the clear button in Edge */
  input[type="date"]::-ms-clear,
  input[type="time"]::-ms-clear,
  input[type="datetime-local"]::-ms-clear {
    display: none;
  }
`;

// Module-scope helpers for stable identity
const toLocalDateInputValue = (date: Date): string =>
	date.toLocaleDateString("en-GB"); // DD/MM/YYYY

const toLocalDateTimeInputValue = (date: Date): string => {
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
		date.getMinutes(),
	)}`;
};

const parseDisplayToDate = (
	display?: string,
	format?: string,
): Date | undefined => {
	if (!display || typeof display !== "string") return undefined;
	const s = display.trim();
	if (!s) return undefined;
	try {
		if (format === "date") {
			// Expect dd/MM/yyyy
			const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
			if (!m) return undefined;
			const day = parseInt(m[1], 10);
			const month = parseInt(m[2], 10) - 1;
			let year = parseInt(m[3], 10);
			if (year < 100) year += 2000;
			const d = new Date(year, month, day);
			return Number.isNaN(d.getTime()) ? undefined : d;
		}
		if (format === "time") {
			// Support HH:mm or hh:mm AM/PM
			const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
			if (!m) return undefined;
			let hours = parseInt(m[1], 10);
			const minutes = parseInt(m[2], 10);
			const ampm = m[3]?.toLowerCase();
			if (ampm) {
				if (ampm === "pm" && hours < 12) hours += 12;
				if (ampm === "am" && hours === 12) hours = 0;
			}
			const today = new Date();
			const d = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				hours,
				minutes,
			);
			return Number.isNaN(d.getTime()) ? undefined : d;
		}
		// datetime: expect dd/MM/yyyy hh:mm AM/PM
		const m = s.match(
			/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s+(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/,
		);
		if (!m) return undefined;
		const day = parseInt(m[1], 10);
		const month = parseInt(m[2], 10) - 1;
		let year = parseInt(m[3], 10);
		if (year < 100) year += 2000;
		let hours = parseInt(m[4], 10);
		const minutes = parseInt(m[5], 10);
		const ampm = m[6].toLowerCase();
		if (ampm === "pm" && hours < 12) hours += 12;
		if (ampm === "am" && hours === 12) hours = 0;
		const d = new Date(year, month, day, hours, minutes);
		return Number.isNaN(d.getTime()) ? undefined : d;
	} catch {
		return undefined;
	}
};

const renderer: CustomRenderer<TempusDateCell> = {
	kind: GridCellKind.Custom,
	isMatch: (c): c is TempusDateCell =>
		(c.data as { kind?: string }).kind === "tempus-date-cell",

	draw: (args, cell) => {
		const { displayDate } = cell.data;
		drawTextCell(args, displayDate || "", cell.contentAlign);
		return true;
	},

	measure: (ctx, cell, theme) => {
		const { displayDate } = cell.data;
		return (
			ctx.measureText(displayDate || "").width + theme.cellHorizontalPadding * 2
		);
	},

	provideEditor: () => ({
		editor: (props) => {
			const { data } = props.value;
			const { onFinishedEditing } = props;
			const inputRef = React.useRef<HTMLInputElement>(null);
			const wrapperRef = React.useRef<HTMLDivElement>(null);
			const iconButtonRef = React.useRef<HTMLButtonElement>(null);
			const [tempusInstance, setTempusInstance] = React.useState<{
				dates: { setValue: (target?: unknown, index?: number) => void };
				toggle?: () => void;
				dispose?: () => void;
			} | null>(null);

			// Animation state refs (top-level to satisfy hooks rules)
			const lastAnimationRef = React.useRef<{
				action: "show" | "hide";
				at: number;
			} | null>(null);
			const isWidgetVisibleRef = React.useRef<boolean>(false);

			// Get vacation periods from context
			const { vacationPeriods } = useVacation();

			// Using module-scope helpers: toLocalDateInputValue, toLocalDateTimeInputValue

			// Inject CSS to hide native date picker controls
			React.useEffect(() => {
				if (!document.getElementById("hide-native-date-picker")) {
					const style = document.createElement("style");
					style.id = "hide-native-date-picker";
					style.textContent = hideNativeDatePickerCSS;
					document.head.appendChild(style);
				}
			}, []);

			// Helper function to format display dates - moved here to avoid temporal dead zone
			const formatDisplayDate = React.useCallback(
				(date: Date, format?: string): string => {
					if (!date) return "";

					switch (format) {
						case "time":
							return date.toLocaleTimeString("en-US", {
								hour: "2-digit",
								minute: "2-digit",
								hour12: true,
							});
						case "datetime":
							return date.toLocaleString("en-GB", {
								day: "2-digit",
								month: "2-digit",
								year: "numeric",
								hour: "2-digit",
								minute: "2-digit",
								hour12: true,
							});
						default:
							return date.toLocaleDateString("en-GB");
					}
				},
				[],
			);

			// Keep the visible input in sync with a chosen date
			const setInputFromDate = React.useCallback(
				(date: Date) => {
					if (!inputRef.current) return;
					let nextVal = "";
					switch (data.format) {
						case "time":
							nextVal = date.toTimeString().slice(0, 5);
							break;
						case "datetime":
							nextVal = toLocalDateTimeInputValue(date);
							break;
						default:
							nextVal = toLocalDateInputValue(date);
					}
					inputRef.current.value = nextVal;
				},
				[data.format],
			);

			// Using module-scope helper: parseDisplayToDate

			const handleIconClick = React.useCallback(
				async (e: React.MouseEvent<HTMLButtonElement>) => {
					e.preventDefault();
					e.stopPropagation();

					const event = e.nativeEvent;
					if (event.stopImmediatePropagation) {
						event.stopImmediatePropagation();
					}

					if (!inputRef.current) return;

					// Don't reinitialize if already initialized
					if (tempusInstance) {
						try {
							tempusInstance.toggle?.();
						} catch (error) {
							console.warn("Failed to toggle Tempus Dominus widget:", error);
						}
						return;
					}

					// Dynamically import Tempus Dominus
					try {
						const { TempusDominus, DateTime, Namespace } = await import(
							"@eonasdan/tempus-dominus"
						);

						// Get centralized date restrictions
						const dateRestrictions = getDateRestrictions(
							vacationPeriods,
							data.freeRoam || false, // Use freeRoam from cell data
							data.date,
						);
						const tempusRestrictions = formatForTempusDominus(dateRestrictions);

						// Convert disabled dates to DateTime objects
						const disabledDateTimes =
							tempusRestrictions.disabledDates?.map(
								(date) => new DateTime(date),
							) || [];

						const options = {
							display: {
								components: {
									calendar: data.format !== "time",
									date: data.format !== "time",
									month: data.format !== "time",
									year: data.format !== "time",
									decades: data.format !== "time",
									clock: data.format !== "date",
									hours: data.format !== "date",
									minutes: data.format !== "date",
									seconds: false,
								},
								theme: (document.documentElement.classList.contains("dark")
									? "dark"
									: "light") as "dark" | "light",
								buttons: {
									today: true,
									clear: false,
									close: false,
								},
								placement: "bottom" as "bottom",
								keepOpen: true,
							},
							restrictions: {
								minDate: tempusRestrictions.minDate
									? new DateTime(tempusRestrictions.minDate)
									: undefined,
								maxDate: tempusRestrictions.maxDate
									? new DateTime(tempusRestrictions.maxDate)
									: undefined,
								disabledDates: disabledDateTimes,
								daysOfWeekDisabled: tempusRestrictions.daysOfWeekDisabled,
								enabledHours: tempusRestrictions.enabledHours,
							},
							localization: {
								locale: "en-GB",
								format:
									data.format === "time"
										? "hh:mm A"
										: data.format === "date"
											? "dd/MM/yyyy"
											: "dd/MM/yyyy hh:mm A",
								hourCycle: "h12" as const,
							},

							container: document.body,
							stepping: (() => {
								try {
									const env = process.env.NEXT_PUBLIC_SLOT_DURATION_HOURS;
									const parsed = env !== undefined ? Number(env) : Number.NaN;
									return Number.isFinite(parsed) && parsed > 0
										? Math.max(1, Math.floor(parsed * 60))
										: 120;
								} catch {
									return 120;
								}
							})(),
						};

						const inputElement = inputRef.current;
						if (!inputElement) return;
						const instance = new TempusDominus(
							inputElement,
							options,
						) as unknown as {
							dates: { setValue: (target?: unknown, index?: number) => void };
							toggle?: () => void;
							dispose?: () => void;
						};
						setTempusInstance(instance);

						// Force the widget to be appended to body if it's not already
						setTimeout(() => {
							const widgets = document.querySelectorAll(
								'.tempus-dominus-widget, [class*="tempus-dominus"]',
							);
							widgets.forEach((widget) => {
								if (widget.parentElement !== document.body) {
									document.body.appendChild(widget);
								}
							});
						}, 0);

						// Set initial value (plugin and input) from data.date or parsed display
						{
							const initialDate =
								data.date || parseDisplayToDate(data.displayDate, data.format);
							if (initialDate) {
								try {
									instance.dates.setValue(new DateTime(initialDate));
									if (inputRef.current) {
										let seededValue = "";
										if (data.format === "time") {
											seededValue = initialDate.toTimeString().slice(0, 5);
										} else if (data.format === "datetime") {
											seededValue = toLocalDateTimeInputValue(initialDate);
										} else {
											seededValue = toLocalDateInputValue(initialDate);
										}
										inputRef.current.value = seededValue;
									}
								} catch (error) {
									console.warn("Failed to set initial date value:", error);
								}
							}
						}

						// Helper to add click-outside-ignore to widget and its children
						const markWidgetSafe = (w: HTMLElement) => {
							if (!w.classList.contains("click-outside-ignore")) {
								w.classList.add("click-outside-ignore");
								w.querySelectorAll("*").forEach((el) => {
									(el as HTMLElement).classList.add("click-outside-ignore");
								});
							}

							// Continuously ensure any new children are marked so overlay's click-outside logic ignores them.
							if (!(w as { _glideOutsidePatch?: boolean })._glideOutsidePatch) {
								const ensureIgnored = (node: HTMLElement) => {
									if (!node.classList.contains("click-outside-ignore")) {
										node.classList.add("click-outside-ignore");
									}
									node.querySelectorAll("*").forEach((el) => {
										if (
											!(el as HTMLElement).classList.contains(
												"click-outside-ignore",
											)
										) {
											(el as HTMLElement).classList.add("click-outside-ignore");
										}
									});
								};

								// Initial pass
								ensureIgnored(w);

								// Observe for dynamically created descendants (e.g., time-arrow buttons)
								const mo = new MutationObserver((muts) => {
									muts.forEach((mut) => {
										mut.addedNodes.forEach((node) => {
											if (node instanceof HTMLElement) {
												ensureIgnored(node);
											}
										});
									});
								});
								mo.observe(w, { childList: true, subtree: true });

								(
									w as {
										_glideOutsidePatch?: boolean;
										_glideOutsideObserver?: MutationObserver;
									}
								)._glideOutsidePatch = true;
								(
									w as {
										_glideOutsidePatch?: boolean;
										_glideOutsideObserver?: MutationObserver;
									}
								)._glideOutsideObserver = mo;
							}
						};

						// Function to find and animate the widget with throttling
						const animateWidget = (action: "show" | "hide") => {
							const now =
								typeof performance !== "undefined"
									? performance.now()
									: Date.now();
							const last = lastAnimationRef.current;
							if (last && last.action === action && now - last.at < 350) {
								return; // Skip duplicate animation calls in a short window
							}
							if (action === "show" && isWidgetVisibleRef.current) return;
							if (action === "hide" && !isWidgetVisibleRef.current) return;
							lastAnimationRef.current = { action, at: now };

							let widget: HTMLElement | null = null;

							// Method 1: Look for the widget in the instance
							try {
								if (
									(instance as { display?: { widget?: Element } }).display
										?.widget
								) {
									widget = (instance as { display?: { widget?: Element } })
										.display?.widget as HTMLElement;
								} else if (
									(instance as { popover?: { tip?: Element } }).popover?.tip
								) {
									widget = (instance as { popover?: { tip?: Element } }).popover
										?.tip as HTMLElement;
								} else if ((instance as { _widget?: Element })._widget) {
									widget = (instance as { _widget?: Element })
										._widget as HTMLElement;
								}
							} catch (_e) {
								// Silently fail
							}

							// Method 2: Query for the widget - prioritize body-level widgets
							if (!widget) {
								const bodyWidgets = Array.from(
									document.body.querySelectorAll(
										':scope > .tempus-dominus-widget, :scope > [class*="tempus-dominus"], :scope > .dropdown-menu[id*="tempus"]',
									),
								) as HTMLElement[];

								const allWidgets =
									bodyWidgets.length > 0
										? bodyWidgets
										: (Array.from(
												document.querySelectorAll(
													'.tempus-dominus-widget, .tempus-dominus-container, [class*="tempus-dominus"], .dropdown-menu[id*="tempus"]',
												),
											) as HTMLElement[]);

								widget =
									allWidgets.find((w) => {
										const display = window.getComputedStyle(w).display;
										return display !== "none";
									}) ||
									allWidgets[allWidgets.length - 1] ||
									null;
							}

							if (!widget) return;

							markWidgetSafe(widget);

							// Ensure widget is in body before positioning/animating
							if (widget.parentElement !== document.body) {
								document.body.appendChild(widget);
							}

							if (action === "show") {
								// Start animation after Popper computes position
								requestAnimationFrame(() => {
									widget.classList.remove(
										"tempus-dominus-widget-animated-out",
										"tempus-dominus-widget-hidden",
									);
									widget.style.animation = "none";
									void widget.offsetHeight;

									widget.classList.add("tempus-dominus-widget-animated-in");
									widget.classList.add("tempus-dominus-widget-transition");

									widget.style.opacity = "0";
									widget.style.transition = "none";

									void widget.offsetHeight;

									requestAnimationFrame(() => {
										widget.style.transition =
											"opacity 250ms cubic-bezier(0.16, 1, 0.3, 1)";
										widget.style.opacity = "1";
										widget.classList.add("tempus-dominus-widget-visible");
										isWidgetVisibleRef.current = true;
									});
								});
							} else {
								widget.classList.remove(
									"tempus-dominus-widget-animated-in",
									"tempus-dominus-widget-visible",
								);
								widget.classList.add("tempus-dominus-widget-animated-out");
								widget.classList.add("tempus-dominus-widget-transition");
								widget.classList.add("tempus-dominus-widget-hidden");

								widget.style.transition =
									"opacity 200ms cubic-bezier(0.4, 0, 1, 1)";
								widget.style.opacity = "0";
								isWidgetVisibleRef.current = false;
							}
						};

						// Handle show event for animations
						const handleShow = (_e: Event) => {
							setTimeout(() => {
								const widgets = document.querySelectorAll(
									'.tempus-dominus-widget, [class*="tempus-dominus"]',
								);
								let movedWidget = false;
								widgets.forEach((widget) => {
									if (
										widget.parentElement !== document.body &&
										window.getComputedStyle(widget).display !== "none"
									) {
										document.body.appendChild(widget);
										movedWidget = true;
									}
								});

								if (movedWidget) {
									requestAnimationFrame(() => {
										requestAnimationFrame(() => {
											animateWidget("show");
										});
									});
								} else {
									animateWidget("show");
								}
							}, 0);
						};

						// Subscribe to date change events
						const handleDateChange = (e: { date?: Date }) => {
							try {
								if (e.date) {
									const jsDate = new Date(e.date.valueOf());
									const newCell = {
										...props.value,
										data: {
											...data,
											date: jsDate,
											displayDate: formatDisplayDate(jsDate, data.format),
										},
									} as typeof props.value;
									props.onChange(newCell);
									// Ensure the visible input reflects the chosen value immediately
									setInputFromDate(jsDate);
								} else if ((e as { isClear?: boolean })?.isClear) {
									const cleared = {
										...props.value,
										data: { ...data, date: undefined, displayDate: "" },
									} as typeof props.value;
									props.onChange(cleared);
									if (inputRef.current) inputRef.current.value = "";
								}
							} catch (error) {
								console.warn("Failed to handle date change:", error);
							}
						};

						// Subscribe to hide event - this fires when picker closes
						const handleHide = (e: Event) => {
							try {
								if (
									data.format === "time" &&
									e &&
									typeof e.preventDefault === "function"
								) {
									e.preventDefault();
									return;
								}

								animateWidget("hide");

								const selectedDates = (
									instance as { dates?: { picked?: Date[] } }
								)?.dates?.picked;
								if (
									selectedDates &&
									Array.isArray(selectedDates) &&
									selectedDates.length > 0
								) {
									const selectedDateTime = selectedDates[0];
									const jsDate = new Date(selectedDateTime.valueOf());

									const newCell = {
										...props.value,
										data: {
											...data,
											date: jsDate,
											displayDate: formatDisplayDate(jsDate, data.format),
										},
									} as typeof props.value;
									props.onChange(newCell);
									// Sync the visible input with the chosen date
									setInputFromDate(jsDate);
									onFinishedEditing?.(newCell);
								}
							} catch (error) {
								console.warn("Failed to handle date picker hide:", error);
								// Still call onFinishedEditing to close the editor
								onFinishedEditing?.(props.value);
							}
						};

						// Subscribe to events
						let showSubscription: { unsubscribe: () => void } | undefined,
							changeSubscription: { unsubscribe: () => void } | undefined,
							hideSubscription: { unsubscribe: () => void } | undefined;

						type TempusDominusInstance = {
							subscribe?: (
								evt: unknown,
								handler: unknown,
							) => { unsubscribe: () => void };
							show?: () => void;
							dates?: { picked?: Date[] };
						};
						const td = instance as unknown as TempusDominusInstance;
						try {
							showSubscription = td.subscribe?.(
								Namespace.events.show,
								handleShow,
							) as { unsubscribe: () => void } | undefined;
							changeSubscription = td.subscribe?.(
								Namespace.events.change,
								handleDateChange,
							) as { unsubscribe: () => void } | undefined;
							hideSubscription = td.subscribe?.(
								Namespace.events.hide,
								handleHide,
							) as { unsubscribe: () => void } | undefined;
						} catch (error) {
							console.warn(
								"Failed to subscribe to Tempus Dominus events:",
								error,
							);
						}

						// Try to detect widget creation using MutationObserver
						const widgetObserver = new MutationObserver((mutations) => {
							for (const mutation of mutations) {
								for (const node of mutation.addedNodes) {
									if (node instanceof HTMLElement) {
										const isWidget =
											node.classList.contains("tempus-dominus-widget") ||
											node.classList.contains("dropdown-menu") ||
											node.querySelector(".tempus-dominus-widget") ||
											node.id?.includes("tempus");

										if (isWidget) {
											const widget = node.classList.contains(
												"tempus-dominus-widget",
											)
												? (node as HTMLElement)
												: (node.querySelector(
														".tempus-dominus-widget",
													) as HTMLElement) || (node as HTMLElement);

											markWidgetSafe(widget);
											setTimeout(() => animateWidget("show"), 10);
											break;
										}
									}
								}
							}
						});

						// Observe the entire document for widget creation
						widgetObserver.observe(document.body, {
							childList: true,
							subtree: true,
						});

						// Listen for input changes directly on the input field
						const handleInputChange = () => {
							const inputValue = inputRef.current?.value;
							if (inputValue) {
								try {
									const parsedDate = new Date(inputValue);
									if (!Number.isNaN(parsedDate.getTime())) {
										const newCell = {
											...props.value,
											data: {
												...data,
												date: parsedDate,
												displayDate: formatDisplayDate(parsedDate, data.format),
											},
										} as typeof props.value;
										props.onChange(newCell);
									}
								} catch (_error) {
									// Silently fail
								}
							}
						};

						// Listen for input events on the input field
						inputRef.current?.addEventListener("input", handleInputChange);
						inputRef.current?.addEventListener("change", handleInputChange);

						// Store subscriptions for cleanup
						const instanceWithProps = instance as {
							_showSubscription?: { unsubscribe: () => void };
							_changeSubscription?: { unsubscribe: () => void };
							_hideSubscription?: { unsubscribe: () => void };
							_inputHandler?: (event: Event) => void;
							_widgetObserver?: MutationObserver;
						};
						instanceWithProps._showSubscription = showSubscription;
						instanceWithProps._changeSubscription = changeSubscription;
						instanceWithProps._hideSubscription = hideSubscription;
						instanceWithProps._inputHandler = handleInputChange;
						instanceWithProps._widgetObserver = widgetObserver;

						// Show the widget after initialization with proper positioning
						requestAnimationFrame(() => {
							// Ensure focus before toggling for consistent TD behavior
							inputRef.current?.focus();
							try {
								if ((instance as { toggle?: () => void }).toggle) {
									(instance as { toggle?: () => void }).toggle?.();
								} else {
									(td.show ?? (() => {}))();
								}
								// Force Popper to compute initial position
								try {
									(
										instance as unknown as {
											display?: { updatePopup?: () => void };
										}
									).display?.updatePopup?.();
								} catch {}

								// Wait a bit longer for TD to create the widget, then animate
								setTimeout(() => {
									const widget = document.querySelector(
										'.tempus-dominus-widget, [class*="tempus-dominus"], .dropdown-menu[id*="tempus"]',
									) as HTMLElement | null;

									if (widget) {
										markWidgetSafe(widget);
										// Small delay to ensure Popper applied position before animation
										setTimeout(() => animateWidget("show"), 10);
									}
									// Extra assurance: update Popper again
									try {
										(
											instance as unknown as {
												display?: { updatePopup?: () => void };
											}
										).display?.updatePopup?.();
									} catch {}
								}, 50);
							} catch (error) {
								console.warn("Failed to show Tempus Dominus widget:", error);
							}
						});
					} catch (error) {
						console.warn(
							"Tempus Dominus failed to load, falling back to native input:",
							error,
						);
					}
				},
				[
					tempusInstance,
					data,
					formatDisplayDate,
					onFinishedEditing,
					props.onChange,
					props.value,
					vacationPeriods,
					setInputFromDate,
				],
			);

			// Cleanup effect
			React.useEffect(() => {
				return () => {
					if (tempusInstance) {
						try {
							// Disconnect observers
							const widgetInstance = tempusInstance as {
								_widgetObserver?: { disconnect: () => void };
							};
							if (widgetInstance._widgetObserver) {
								widgetInstance._widgetObserver.disconnect();
							}
							// Unsubscribe from events
							const tempInstance = tempusInstance as {
								_showSubscription?: { unsubscribe: () => void };
								_changeSubscription?: { unsubscribe: () => void };
							};
							if (tempInstance._showSubscription) {
								tempInstance._showSubscription.unsubscribe();
							}
							if (tempInstance._changeSubscription) {
								tempInstance._changeSubscription.unsubscribe();
							}
							const instance = tempusInstance as {
								_hideSubscription?: { unsubscribe: () => void };
							};
							if (instance._hideSubscription) {
								instance._hideSubscription.unsubscribe();
							}
							// Remove input event listeners
							if (inputRef.current) {
								const instance = tempusInstance as {
									_inputHandler?: (event: Event) => void;
								};
								if (instance._inputHandler) {
									inputRef.current.removeEventListener(
										"input",
										instance._inputHandler,
									);
									inputRef.current.removeEventListener(
										"change",
										instance._inputHandler,
									);
								}
							}
							// Dispose the instance
							try {
								(
									tempusInstance as unknown as { dispose?: () => void }
								).dispose?.();
							} catch {
								/* ignore */
							}
						} catch (error) {
							console.error("Failed to dispose Tempus Dominus:", error);
						}
					}
				};
			}, [tempusInstance]);

			const getInputType = () => {
				switch (data.format) {
					case "time":
						return "time";
					case "datetime":
						return "datetime-local";
					default:
						return "text";
				}
			};

			const getInputValue = () => {
				let baseDate = data.date;
				if (!baseDate && data.displayDate) {
					baseDate = parseDisplayToDate(data.displayDate, data.format);
				}
				if (!baseDate) return "";
				switch (data.format) {
					case "time":
						return baseDate.toTimeString().slice(0, 5);
					case "datetime":
						return toLocalDateTimeInputValue(baseDate);
					default:
						return toLocalDateInputValue(baseDate);
				}
			};

			const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
				const value = e.target.value;

				// Ignore empty string changes to avoid unintended clearing when
				// initializing or opening the Tempus Dominus widget programmatically.
				// Clearing should only happen via explicit picker events (e.g., clear)
				// or validated manual input, not incidental empty inputs.
				if (value == null || value.trim() === "") {
					return;
				}
				let newDate: Date | undefined;

				if (value) {
					if (data.format === "time") {
						const today = new Date();
						const [hours, minutes] = value.split(":").map(Number);
						if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
							newDate = new Date(
								today.getFullYear(),
								today.getMonth(),
								today.getDate(),
								hours,
								minutes,
							);
						}
					} else if (data.format === "date") {
						const parts = value.split("/").map(Number);
						if (parts.length === 3) {
							const [day, month, year] = parts;
							if (
								!Number.isNaN(day) &&
								!Number.isNaN(month) &&
								!Number.isNaN(year)
							) {
								newDate = new Date(year, month - 1, day);
							}
						}
					} else {
						newDate = new Date(value);
						if (Number.isNaN(newDate.getTime())) {
							newDate = undefined;
						}
					}
				}

				const newCell = {
					...props.value,
					data: {
						...data,
						date: newDate,
						displayDate: newDate ? formatDisplayDate(newDate, data.format) : "",
					},
				} as typeof props.value;
				props.onChange(newCell);
			};

			const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
				const next = e.relatedTarget as HTMLElement | null;
				const widgetOpen = !!document.querySelector(
					".tempus-dominus-widget.tempus-dominus-widget-visible",
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
					handleChange({
						target: { value: inputValue },
					} as React.ChangeEvent<HTMLInputElement>);
				}
				onFinishedEditing?.(props.value);
			};

			const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
				if (e.key === "Enter" || e.key === "Tab") {
					e.preventDefault();
					const inputValue = inputRef.current?.value;
					if (inputValue) {
						handleChange({
							target: { value: inputValue },
						} as React.ChangeEvent<HTMLInputElement>);
					}
					onFinishedEditing?.(props.value);
				} else if (e.key === "Escape") {
					e.preventDefault();
					if (inputRef.current && data.date) {
						inputRef.current.value = getInputValue();
					}
					onFinishedEditing?.(props.value);
				}
			};

			const getMinValue = () => {
				if (!data.min) return undefined;

				switch (data.format) {
					case "time":
						return data.min.toTimeString().slice(0, 5);
					case "datetime":
						return toLocalDateTimeInputValue(data.min);
					default:
						return toLocalDateInputValue(data.min);
				}
			};

			const getMaxValue = () => {
				if (!data.max) return undefined;

				switch (data.format) {
					case "time":
						return data.max.toTimeString().slice(0, 5);
					case "datetime":
						return toLocalDateTimeInputValue(data.max);
					default:
						return toLocalDateInputValue(data.max);
				}
			};

			if (data.readonly) {
				return (
					<div style={wrapperStyle}>
						<span style={editorStyle}>{data.displayDate || ""}</span>
					</div>
				);
			}

			return (
				<div ref={wrapperRef} style={wrapperStyle}>
					<input
						ref={inputRef}
						style={editorStyle}
						type={getInputType()}
						defaultValue={getInputValue()}
						min={getMinValue()}
						max={getMaxValue()}
						onChange={handleChange}
						onBlur={handleBlur}
						onKeyDown={handleKeyDown}
						disabled={data.readonly}
						placeholder={
							data.format === "date"
								? "dd/mm/yyyy"
								: data.format === "time"
									? "hh:mm"
									: ""
						}
					/>
					<button
						type="button"
						ref={iconButtonRef}
						style={{
							...iconButtonStyle,
							opacity: data.readonly ? 0.3 : 0.7,
						}}
						onClick={handleIconClick}
						disabled={data.readonly}
						onMouseEnter={(e) => {
							if (!data.readonly) {
								e.currentTarget.style.opacity = "1";
							}
						}}
						onMouseLeave={(e) => {
							if (!data.readonly) {
								e.currentTarget.style.opacity = "0.7";
							}
						}}
					>
						{data.format === "time" ? (
							// Clock icon
							<svg
								width="16"
								height="16"
								viewBox="0 0 16 16"
								fill="currentColor"
								style={{ pointerEvents: "none" }}
								role="img"
								aria-label="Clock icon"
							>
								<path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM8 3a.5.5 0 0 1 .5.5V8a.5.5 0 0 1-.146.354l-2.5 2.5a.5.5 0 0 1-.708-.708L7.293 8H3.5a.5.5 0 0 1 0-1H8V3.5A.5.5 0 0 1 8 3Z" />
							</svg>
						) : (
							// Calendar icon
							<svg
								width="16"
								height="16"
								role="img"
								aria-label="Calendar icon"
								viewBox="0 0 16 16"
								fill="currentColor"
								style={{ pointerEvents: "none" }}
							>
								<path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z" />
								<path d="M3 8.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-6 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z" />
							</svg>
						)}
					</button>
				</div>
			);
		},
		disablePadding: true,
	}),

	onPaste: (v, d) => {
		let parsedDate: Date | undefined;

		if (v) {
			const timestamp = Number(v);
			if (!Number.isNaN(timestamp)) {
				parsedDate = new Date(timestamp);
			} else {
				const parsed = Date.parse(v);
				if (!Number.isNaN(parsed)) {
					parsedDate = new Date(parsed);
				}
			}
		}

		const formatDisplayDate = (date: Date, format?: string): string => {
			if (!date) return "";

			switch (format) {
				case "time":
					return date.toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
						hour12: true,
					});
				case "datetime":
					return date.toLocaleString("en-GB", {
						day: "2-digit",
						month: "2-digit",
						year: "numeric",
						hour: "2-digit",
						minute: "2-digit",
						hour12: true,
					});
				default:
					return date.toLocaleDateString("en-GB");
			}
		};

		return {
			...d,
			date: parsedDate,
			displayDate: parsedDate ? formatDisplayDate(parsedDate, d.format) : "",
		};
	},
};

export default renderer;
