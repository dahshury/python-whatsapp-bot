import {
	type CustomCell,
	type CustomRenderer,
	drawTextCell,
	GridCellKind,
} from "@glideapps/glide-data-grid";
import React from "react";
import type { Country } from "react-phone-number-input";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import { PHONE_INPUT_EDITOR_CONFIG } from "./models/PhoneInputEditorProps";
import { getEditorStyles } from "./services/PhoneInputService";
import { PhoneInput } from "./ui/phone-input";

interface PhoneInputCellProps {
	readonly kind: "phone-input-cell";
	readonly phone?: string;
	readonly displayPhone?: string;
	readonly readonly?: boolean;
	readonly countryCode?: string;
	readonly isDarkTheme?: boolean;
	readonly onCustomerSelect?: (phone: string, customerName?: string) => void;
}

export type PhoneInputCell = CustomCell<PhoneInputCellProps>;

// Stable editor component to prevent unmounts between re-renders
interface PhoneInputEditorProps {
	value: { data?: PhoneInputCellProps };
	onFinishedEditing?: (value: PhoneInputCell) => void;
	onChange: (value: PhoneInputCell) => void;
}

const PhoneInputEditor: React.FC<PhoneInputEditorProps> = (props) => {
	const { data } = props.value;
	const { onFinishedEditing } = props;

	// Type guard to ensure data has the expected properties
	const phoneData = data as PhoneInputCellProps;

	// Parse phone number to E.164 format before using it
	const parsePhoneToE164 = React.useCallback((phone: string): string => {
		if (!phone) return "";

		const phoneStr = phone.trim();

		// If already in E.164 format and valid, return as-is
		if (phoneStr.startsWith("+")) {
			try {
				const parsed = parsePhoneNumber(phoneStr);
				return parsed ? parsed.format("E.164") : phoneStr;
			} catch {
				return phoneStr;
			}
		}

		// Try to infer country from the number itself first
		try {
			const inferred = parsePhoneNumber(phoneStr);
			if (inferred?.country) {
				const parsed = parsePhoneNumber(phoneStr, inferred.country);
				if (parsed) return parsed.format("E.164");
			}
		} catch {}

		// Try parsing without specifying a default country
		try {
			const parsed = parsePhoneNumber(phoneStr);
			if (parsed) {
				return parsed.format("E.164");
			}
		} catch {}

		// As a last resort, if it's digits-only, try prefixing '+' for international parsing
		const digitsOnly = phoneStr.replace(/\D/g, "");
		if (digitsOnly && /^\d{6,15}$/.test(digitsOnly)) {
			try {
				const parsed = parsePhoneNumber(`+${digitsOnly}`);
				if (parsed) return parsed.format("E.164");
			} catch {}
		}

		// Return original input
		return phoneStr;
	}, []);

	const initialPhoneValue = parsePhoneToE164(phoneData?.phone || "");
	const [phoneValue, setPhoneValue] = React.useState<string>(initialPhoneValue);
	const wrapperRef = React.useRef<HTMLDivElement>(null);
	const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

	// Also use the parsePhoneToE164 function in handleCustomerSelect
	const parsePhoneToE164ForSelection = React.useCallback(
		(phone: string): string => {
			return parsePhoneToE164(phone);
		},
		[parsePhoneToE164],
	);

	// Track the last known value and country for change detection
	const lastKnownValue = React.useRef<string>(initialPhoneValue);
	const lastKnownCountry = React.useRef<Country | undefined>(undefined);

	// Get initial country from phone number and update when data.phone changes
	React.useEffect(() => {
		const parsedPhoneValue = parsePhoneToE164(phoneData?.phone || "");
		if (parsedPhoneValue !== phoneValue) {
			setPhoneValue(parsedPhoneValue);
			lastKnownValue.current = parsedPhoneValue;
		}

		try {
			if (parsedPhoneValue?.startsWith("+")) {
				const parsed = parsePhoneNumber(parsedPhoneValue);
				if (parsed?.country) {
					lastKnownCountry.current = parsed.country;
				}
			}
		} catch {}
	}, [phoneData?.phone, parsePhoneToE164, phoneValue]);

	const updateCell = React.useCallback(
		(newPhone: string, shouldFinish = false) => {
			console.log(
				"🔥 PhoneInputCell updateCell called with:",
				newPhone,
				"shouldFinish:",
				shouldFinish,
			);
			console.log("🔥 Current cell data:", data);

			// Clear any pending update
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}

			// Format the display value
			let displayPhone = newPhone;
			if (newPhone && isValidPhoneNumber(newPhone)) {
				displayPhone = newPhone;
			}

			const newCell = {
				kind: GridCellKind.Custom,
				data: {
					...(data as PhoneInputCellProps),
					kind: "phone-input-cell",
					phone: newPhone,
					displayPhone: displayPhone,
				},
				copyData: displayPhone,
				allowOverlay: true,
			} as unknown as PhoneInputCell;

			console.log(
				"🔥 New cell data created:",
				(newCell as PhoneInputCell).data,
			);

			// Let the data grid handle validation - don't mark as invalid here
			console.log("🔥 Calling props.onChange with new cell");
			props.onChange(newCell);

			if (shouldFinish) {
				console.log("🔥 Calling onFinishedEditing");
				onFinishedEditing?.(newCell);
			}
		},
		[props, data, onFinishedEditing],
	);

	// Handle customer selection from the combobox
	const handleCustomerSelect = React.useCallback(
		(phone: string, customerName?: string) => {
			console.log(
				"PhoneInputCell handleCustomerSelect called with:",
				phone,
				customerName,
			);
			console.log(
				"data.onCustomerSelect available:",
				!!phoneData?.onCustomerSelect,
			);

			// Parse phone to E.164 format before storing
			const parsedPhone = parsePhoneToE164ForSelection(phone);
			console.log("🔥 Parsed phone from", phone, "to", parsedPhone);

			// Update phone value with parsed version
			setPhoneValue(parsedPhone);
			lastKnownValue.current = parsedPhone;

			// Update the cell with the parsed phone and finish editing to commit the change
			updateCell(parsedPhone, true);

			// Call the onCustomerSelect callback if provided to handle name auto-population
			if (phoneData?.onCustomerSelect) {
				console.log(
					"Calling data.onCustomerSelect with:",
					parsedPhone,
					customerName,
				);
				phoneData.onCustomerSelect(parsedPhone, customerName);
			} else {
				console.log("data.onCustomerSelect is not available");
			}
		},
		[phoneData, updateCell, parsePhoneToE164ForSelection],
	);

	// Simple backup check to ensure state consistency and cleanup
	React.useEffect(() => {
		if (phoneValue !== lastKnownValue.current) {
			lastKnownValue.current = phoneValue;
		}

		// Cleanup timeout on unmount
		return () => {
			if (updateTimeoutRef.current) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, [phoneValue]);

	const handleChange = React.useCallback(
		(value: string | undefined) => {
			console.log(
				"🔥 PhoneInputCell handleChange called with:",
				value,
				"current phoneValue:",
				phoneValue,
			);

			// Handle the case where react-phone-number-input sends undefined
			// This can happen during country changes or when clearing the input
			if (value === undefined) {
				console.log("🔥 handleChange: value is undefined, checking DOM input");
				// Use requestAnimationFrame for smoother updates
				requestAnimationFrame(() => {
					const inputs =
						wrapperRef.current?.querySelectorAll('input[type="text"]');
					if (inputs && inputs.length > 0) {
						const mainInput = inputs[0] as HTMLInputElement;
						const currentInputValue = mainInput.value;
						console.log(
							"🔥 handleChange: found DOM input value:",
							currentInputValue,
						);

						// Always use the current input value, regardless of what onChange sent
						// This handles country changes properly where the number gets reformatted
						const newPhone = currentInputValue || "";
						if (newPhone !== phoneValue) {
							console.log(
								"🔥 handleChange: updating phoneValue from",
								phoneValue,
								"to",
								newPhone,
							);
							setPhoneValue(newPhone);
							lastKnownValue.current = newPhone;

							// Update cell immediately for country changes (no debounce)
							updateCell(newPhone, false);
						}
					}
				});

				return;
			}

			// Normal case: value is defined
			const newPhone = value || "";
			console.log("🔥 handleChange: normal case, newPhone:", newPhone);

			// Only update if the value actually changed
			if (newPhone !== phoneValue) {
				console.log(
					"🔥 handleChange: phone value changed from",
					phoneValue,
					"to",
					newPhone,
				);
				setPhoneValue(newPhone);
				lastKnownValue.current = newPhone;

				// Finish editing immediately to commit the change to the data source
				updateCell(newPhone, true);
			} else {
				console.log("🔥 handleChange: no change detected");
			}
		},
		[phoneValue, updateCell],
	);

	const handleBlur = React.useCallback(() => {
		// Clear any pending updates
		if (updateTimeoutRef.current) {
			clearTimeout(updateTimeoutRef.current);
		}
		updateCell(phoneValue, true);
	}, [phoneValue, updateCell]);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				// Clear any pending updates
				if (updateTimeoutRef.current) {
					clearTimeout(updateTimeoutRef.current);
				}
				updateCell(phoneValue, true);
			} else if (e.key === "Escape") {
				e.preventDefault();
				// Clear any pending updates
				if (updateTimeoutRef.current) {
					clearTimeout(updateTimeoutRef.current);
				}
				// Revert to original value
				const originalPhone = phoneData?.phone || "";
				setPhoneValue(originalPhone);
				updateCell(originalPhone, true);
			}
		},
		[phoneValue, phoneData?.phone, updateCell],
	);

	const styles = getEditorStyles(phoneData?.isDarkTheme || false);

	return (
		<div ref={wrapperRef} className={styles.wrapperClassName}>
			<div className={styles.innerClassName}>
				<PhoneInput
					value={phoneValue}
					onChange={handleChange}
					onBlur={handleBlur}
					onKeyDown={handleKeyDown}
					onCustomerSelect={handleCustomerSelect}
					placeholder="Enter phone number"
					initialValueFormat="national"
					defaultCountry={lastKnownCountry.current || "SA"}
					className="phone-input w-full border-none focus:ring-0 focus:outline-none bg-transparent"
					style={{
						transform: "translateY(3px)",
						maxWidth: "100%",
					}}
				/>
			</div>
		</div>
	);
};

const renderer: CustomRenderer<PhoneInputCell> = {
	kind: GridCellKind.Custom,
	isMatch: (c): c is PhoneInputCell =>
		(c.data as { kind?: string }).kind === "phone-input-cell",

	draw: (args, cell) => {
		const { displayPhone, phone } = cell.data;
		const displayText = displayPhone || phone || "";

		// Draw the phone number as text without any color changes
		drawTextCell(args, displayText, cell.contentAlign);

		return true;
	},

	measure: (ctx, cell, theme) => {
		const { displayPhone, phone } = cell.data;
		const displayText = displayPhone || phone || "";
		const textWidth = ctx.measureText(displayText).width;
		const padding = theme.cellHorizontalPadding * 2;
		// Return the actual width without reduction
		return textWidth + padding;
	},

	provideEditor: () => {
		const result = {
			editor: PhoneInputEditor,
			disablePadding: PHONE_INPUT_EDITOR_CONFIG.disablePadding,
			disableStyling: PHONE_INPUT_EDITOR_CONFIG.disableStyling,
			needsEscapeKey: PHONE_INPUT_EDITOR_CONFIG.needsEscapeKey,
			needsTabKey: PHONE_INPUT_EDITOR_CONFIG.needsTabKey,
			portalElement: PHONE_INPUT_EDITOR_CONFIG.portalElement,
			width: PHONE_INPUT_EDITOR_CONFIG.customWidth,
			maxWidth: PHONE_INPUT_EDITOR_CONFIG.maxWidth,
		};
		return result as unknown as import("@glideapps/glide-data-grid").ProvideEditorCallbackResult<PhoneInputCell>;
	},

	onPaste: (v: string, d: PhoneInputCellProps) => {
		// Handle paste operations
		const pastedPhone = v.trim();
		let displayPhone = pastedPhone;

		if (pastedPhone && isValidPhoneNumber(pastedPhone)) {
			displayPhone = pastedPhone;
		}

		return {
			kind: GridCellKind.Custom,
			data: { ...d, phone: pastedPhone, displayPhone },
			copyData: displayPhone,
			allowOverlay: true,
		} as unknown as PhoneInputCellProps;
	},
};

export default renderer;
