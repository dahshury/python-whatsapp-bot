"use client";

import { useDebouncedValue } from "@shared/libs/hooks/use-debounced-value";
import { useScrollSelectedIntoView } from "@shared/libs/hooks/use-scroll-selected-into-view";
import { CALLING_CODES_SORTED } from "@shared/libs/phone/countries";
import { cn } from "@shared/libs/utils";
import {
  convertZeroZeroToPlus,
  getCountryFromPhone,
} from "@shared/libs/utils/phone-utils";
import { Button } from "@ui/button";
import { Phone, Search } from "lucide-react";
import type { FC } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type * as RPNInput from "react-phone-number-input";
import {
  getCountryCallingCode,
  parsePhoneNumber,
} from "react-phone-number-input";
import PhoneNumberInput from "react-phone-number-input/input";
import type { PhoneOption } from "@/entities/phone";
import { useDefaultCountryCode } from "@/features/phone-selector/hooks/useDefaultCountryCode";
import { useLanguageStore } from "@/infrastructure/store/app-store";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import { buildPhoneGroups } from "@/shared/libs/phone/phone-groups";
import { buildIndexedOptions } from "@/shared/libs/phone/phone-index";
import {
  canCreateNewPhone,
  createPhoneFuseIndex,
  filterPhones,
  getAddPreviewDisplay,
} from "@/shared/libs/phone/search";
import { ButtonGroup } from "@/shared/ui/button-group";
import { PhoneCountrySelector } from "@/shared/ui/phone/phone-country-selector";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { validatePhoneNumber as validatePhoneNumberSvc } from "@/shared/validation/phone";
import { PhoneNumberSelectorContent } from "@/widgets/phone";

const PHONE_SEARCH_DEBOUNCE_MS = 120;
const SECONDARY_TEXT_GAP_PX = 30;
const POPUP_MAX_VIEWPORT_PERCENT = 90;
const PERCENT_DENOMINATOR = 100;
const POPUP_WIDTH_RATIO = POPUP_MAX_VIEWPORT_PERCENT / PERCENT_DENOMINATOR;
const POPUP_MAX_WIDTH_PX = 560;
const POPUP_MAX_WIDTH_STYLE = `min(${POPUP_MAX_VIEWPORT_PERCENT}vw, ${POPUP_MAX_WIDTH_PX}px)`;
const EMPTY_STATE_ICON_SIZE_PX = 48;
const EMPTY_STATE_SEARCH_ICON_SIZE_PX = 32;
const EMPTY_STATE_GAP_PX = 16;
const EMPTY_STATE_PADDING_PX = 32;
const EMPTY_STATE_BADGE_PADDING_PX = 24;
const EMPTY_STATE_BUTTON_EXTRA_PX = 40;

type GridPhoneComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  phoneOptions: PhoneOption[];
  allowCreateNew?: boolean;
};

/**
 * GridPhoneCombobox - Data Grid only: renders a button group with
 * 1) Country selector (left), 2) Phone input (middle), 3) Dropdown trigger (right)
 * The dropdown lists customers' phone options and selecting fills the input.
 */
const GridPhoneCombobox: FC<GridPhoneComboboxProps> = ({
  value,
  onChange,
  phoneOptions,
  allowCreateNew = false,
}) => {
  const { isLocalized } = useLanguageStore();
  const defaultCountry = useDefaultCountryCode();
  // Convert any incoming string to E.164 (+digits) required by react-phone-number-input
  const toE164 = useCallback((input: string): string => {
    try {
      let s = String(input || "").trim();
      if (!s) {
        return "";
      }
      s = convertZeroZeroToPlus(s);
      // Keep only + and digits for parsing attempt
      const approx = s.replace(/[^\d+]/g, "");
      try {
        const parsed = parsePhoneNumber(approx);
        if (parsed?.number) {
          return parsed.number; // E.164
        }
      } catch {
        // Ignore parse failures; fallback normalization handles invalid numbers.
      }
      // Fallback: strip non-digits and prefix +
      const digits = approx.replace(/\D/g, "");
      return digits ? `+${digits}` : "";
    } catch {
      return String(input || "");
    }
  }, []);

  // Keep a local selected phone in E.164, controlled by value
  const [selectedPhone, setSelectedPhone] = useState<string>(() =>
    toE164(value || "")
  );

  useEffect(() => {
    setSelectedPhone(toE164(value || ""));
  }, [value, toE164]);

  // Validation (no inline error rendering)
  const validatePhone = useCallback(
    (phone: string): { isValid: boolean; error?: string } =>
      validatePhoneNumberSvc(phone),
    []
  );

  // Country handling
  const [country, setCountry] = useState<RPNInput.Country | undefined>(
    defaultCountry
  );

  useEffect(() => {
    if (!selectedPhone.trim()) {
      setCountry(defaultCountry);
    }
  }, [defaultCountry, selectedPhone]);

  // Initialize country from the current value once
  const hasInitializedCountryRef = useRef(false);
  useEffect(() => {
    if (hasInitializedCountryRef.current) {
      return;
    }
    const initial = String(value || selectedPhone || "").trim();
    if (initial) {
      try {
        const inferred = getCountryFromPhone(initial);
        if (inferred) {
          setCountry(inferred);
        }
      } catch {
        // Ignore invalid initial numbers; country will remain default.
      }
    }
    hasInitializedCountryRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhone, value]);

  // Search state for dropdown popover
  const [phoneSearch, setPhoneSearch] = useState("");
  const debouncedPhoneSearch = useDebouncedValue(
    phoneSearch,
    PHONE_SEARCH_DEBOUNCE_MS
  );

  const indexedOptions: IndexedPhoneOption[] = useMemo(
    () => buildIndexedOptions(phoneOptions) as IndexedPhoneOption[],
    [phoneOptions]
  );

  const fuse = useMemo(
    () => createPhoneFuseIndex(indexedOptions),
    [indexedOptions]
  );

  const [filteredPhones, setFilteredPhones] = useState<IndexedPhoneOption[]>(
    []
  );
  useEffect(() => {
    const merged = filterPhones(
      fuse,
      indexedOptions,
      debouncedPhoneSearch
    ) as unknown as IndexedPhoneOption[];
    setFilteredPhones(merged);
  }, [debouncedPhoneSearch, indexedOptions, fuse]);

  const MAX_RENDER_OPTIONS = 400;
  const { groups: phoneGroups, ordered: orderedPhones } = useMemo(
    () =>
      buildPhoneGroups(filteredPhones as IndexedPhoneOption[], {
        selectedPhone,
        recentLimit: 50,
        totalLimit: MAX_RENDER_OPTIONS,
      }),
    [filteredPhones, selectedPhone]
  );

  const addPreviewDisplay = useMemo(
    () =>
      getAddPreviewDisplay(
        debouncedPhoneSearch,
        country as unknown as string,
        (c: string) =>
          String(getCountryCallingCode(c as unknown as RPNInput.Country))
      ),
    [debouncedPhoneSearch, country]
  );

  const canCreateNew = useMemo(
    () =>
      canCreateNewPhone(allowCreateNew, debouncedPhoneSearch, indexedOptions),
    [allowCreateNew, debouncedPhoneSearch, indexedOptions]
  );

  // Dropdown popover state + refs
  const {
    selectedRef: selectedPhoneRef,
    isOpen: isPhoneOpen,
    setIsOpen: setIsPhoneOpen,
  } = useScrollSelectedIntoView<HTMLDivElement>();

  // Trigger ref for popover width sync
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(
    undefined
  );
  useLayoutEffect(() => {
    if (!isPhoneOpen) {
      return;
    }
    try {
      // Measure content width similar to PhoneCombobox
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }
      const bodyStyle = getComputedStyle(document.body);
      const fontFamily = bodyStyle.fontFamily || "ui-sans-serif, system-ui";
      const primaryFont = `600 14px ${fontFamily}`;
      const secondaryFont = `400 14px ${fontFamily}`;
      const measure = (text: string, font: string): number => {
        ctx.font = font;
        return Math.ceil(ctx.measureText(text || "").width);
      };
      let maxContent = 0;
      for (const opt of orderedPhones) {
        const primary = opt.name || opt.displayNumber || opt.number;
        const secondary = opt.displayNumber || opt.number;
        const primaryW = measure(primary, primaryFont);
        const secondaryW = measure(secondary, secondaryFont);
        const line = Math.max(primaryW, secondaryW + SECONDARY_TEXT_GAP_PX);
        maxContent = Math.max(maxContent, line);
      }

      // Calculate minimum width for empty states (add new phone, no results, no data)
      let minEmptyStateWidth = 0;
      if (orderedPhones.length === 0) {
        const titleFont = `600 14px ${fontFamily}`; // font-semibold text-sm
        const descFont = `400 12px ${fontFamily}`; // text-xs
        const titleText = "Add new phone number";
        const descText =
          "We couldn't find this number. Create it to start tracking conversations.";

        if (canCreateNew) {
          // Use create-new state text
          const badgeText = addPreviewDisplay || "Enter a phone number";
          const buttonText = "Add number";
          const titleW = measure(titleText, titleFont);
          const descW = measure(descText, descFont);
          const badgeW =
            measure(badgeText, secondaryFont) + EMPTY_STATE_BADGE_PADDING_PX;
          const buttonW =
            measure(buttonText, secondaryFont) + EMPTY_STATE_BUTTON_EXTRA_PX;
          const emptyStateContent = Math.max(titleW, descW, badgeW, buttonW);
          minEmptyStateWidth =
            emptyStateContent +
            EMPTY_STATE_ICON_SIZE_PX +
            EMPTY_STATE_GAP_PX +
            EMPTY_STATE_PADDING_PX;
        } else {
          // Use no-results/no-data state text with constrained width (text wraps)
          // Cap at 280px to prevent overly wide dropdown
          const MAX_EMPTY_STATE_TEXT_WIDTH = 280;
          minEmptyStateWidth =
            MAX_EMPTY_STATE_TEXT_WIDTH +
            EMPTY_STATE_SEARCH_ICON_SIZE_PX +
            EMPTY_STATE_GAP_PX +
            EMPTY_STATE_PADDING_PX;
        }
      }

      const H_PADDING = 24;
      const CHECK_ICON = 28;
      const SCROLLBAR = 16;
      const INPUT_PADDING = 20;
      let computed =
        maxContent + H_PADDING + CHECK_ICON + SCROLLBAR + INPUT_PADDING;
      const triggerW = triggerRef.current?.offsetWidth || 0;
      const minWidth = minEmptyStateWidth > 0 ? minEmptyStateWidth : triggerW;
      computed = Math.max(computed, minWidth);
      const maxWidth = Math.min(
        Math.floor(window.innerWidth * POPUP_WIDTH_RATIO),
        POPUP_MAX_WIDTH_PX
      );
      computed = Math.min(computed, maxWidth);
      setDropdownWidth(computed);
    } catch {
      // Ignore measurement errors; dropdown width will rely on default sizing.
    }
  }, [isPhoneOpen, orderedPhones, canCreateNew, addPreviewDisplay]);

  // Handlers
  const handleSelectFromDropdown = (phoneNumber: string) => {
    try {
      const inferred = getCountryFromPhone(phoneNumber);
      if (inferred) {
        setCountry(inferred);
      }
    } catch {
      // Ignore lookup errors; keep existing country selection unchanged.
    }
    const next = toE164(phoneNumber);
    setSelectedPhone(next);
    onChange(next);
    setIsPhoneOpen(false);
  };

  const handleCreateNewPhone = (raw: string) => {
    // Accept raw input (prepend current CC if numeric only)
    let next = String(raw || "").trim();
    // Normalize 00 -> +
    if (next.startsWith("00")) {
      next = `+${next.slice(2)}`;
    }
    // If no + prefix, attach selected country code
    if (next && !next.startsWith("+")) {
      try {
        const cc = getCountryCallingCode(
          (country || defaultCountry) as RPNInput.Country
        );
        next = `+${cc}${next.replace(/\D/g, "")}`;
      } catch {
        // Ignore failures when deriving country calling code; fallback keeps user input.
      }
    }
    // Convert to E.164 for the input component
    const e164 = toE164(next);
    validatePhone(e164);
    setSelectedPhone(e164);
    onChange(e164);
    setIsPhoneOpen(false);
    setPhoneSearch("");
  };

  const handleCountrySelect = (selectedCountry: RPNInput.Country) => {
    setCountry(selectedCountry);
    // Reformat/initialize number for new country
    const current = String(selectedPhone || "").trim();
    if (current) {
      let updated = false;
      try {
        const phoneNumber = parsePhoneNumber(current);
        if (phoneNumber) {
          const nationalNumber = String(phoneNumber.nationalNumber || "");
          const newCountryCode = getCountryCallingCode(selectedCountry);
          const newPhoneNumber = nationalNumber
            ? `+${newCountryCode}${nationalNumber}`
            : `+${newCountryCode}`;
          updated = true;
          setSelectedPhone(newPhoneNumber);
          onChange(newPhoneNumber);
        }
      } catch {
        // Ignore parse failures; fallback logic below will attempt manual conversion.
      }
      if (!updated) {
        // Fallback: naive replace of calling code prefix
        const digits = current.replace(/\D/g, "");
        let localDigits = digits;
        const matched = CALLING_CODES_SORTED.find((code) =>
          digits.startsWith(code)
        );
        if (matched) {
          localDigits = digits.slice(matched.length);
        }
        try {
          const newCc = getCountryCallingCode(selectedCountry);
          const newPhoneNumber = localDigits
            ? `+${newCc}${localDigits}`
            : `+${newCc}`;
          setSelectedPhone(newPhoneNumber);
          onChange(newPhoneNumber);
        } catch {
          // Ignore lookup errors; if failing, retain the previous phone number.
        }
      }
    } else {
      try {
        const newCc = getCountryCallingCode(selectedCountry);
        const next = `+${newCc}`;
        setSelectedPhone(next);
        onChange(next);
      } catch {
        // Ignore conversion errors; leave phone number unchanged if CC lookup fails.
      }
    }
  };

  // Input typing is handled by react-phone-number-input/input via onChange

  // Placeholder not used when using national format input

  // Country selector search state and popover
  const [countrySearch, setCountrySearch] = useState("");
  const {
    selectedRef: selectedCountryRef,
    isOpen: isCountryOpen,
    setIsOpen: setIsCountryOpen,
  } = useScrollSelectedIntoView<HTMLDivElement>();

  return (
    <div className="w-full" dir="ltr">
      <ButtonGroup aria-label="Phone editor button group" className="w-full">
        {/* Left: Country selector - show all countries for grid editing */}
        <PhoneCountrySelector
          className={cn("h-9 px-2")}
          country={country}
          isOpen={isCountryOpen}
          search={countrySearch}
          selectedRef={selectedCountryRef}
          setCountry={handleCountrySelect}
          setIsOpen={setIsCountryOpen}
          setSearch={setCountrySearch}
          size="default"
        />

        {/* Middle: Phone number input from react-phone-number-input (numeric-only behavior) */}
        <div className="relative min-w-0 flex-1">
          <Phone className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
          <PhoneNumberInput
            dir="ltr"
            inputMode="tel"
            onChange={(val?: string) => {
              const next = String(val || "");
              // Validate but don't block
              validatePhone(next);
              setSelectedPhone(next);
              onChange(next);
            }}
            value={selectedPhone}
            {...(country ? { defaultCountry: country } : {})}
            className={cn(
              "h-9 w-full rounded-none border border-input border-r-0 border-l-0 bg-background pl-9",
              "focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            useNationalFormatForDefaultCountryValue={true}
          />
        </div>

        {/* Right: Dropdown trigger with existing customers */}
        <Popover onOpenChange={setIsPhoneOpen} open={isPhoneOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-label="Open phone options"
              className={cn(
                "h-9 w-9 justify-center rounded-s-none border-l-0 p-0 focus:z-10"
              )}
              ref={triggerRef}
              type="button"
              variant="outline"
            >
              <Search className="size-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            avoidCollisions={false}
            className={cn(
              "p-0",
              "click-outside-ignore",
              "grid-phone-combobox-popover"
            )}
            dir="ltr"
            onInteractOutside={(event) => {
              const originalEvent = event.detail?.originalEvent;
              const target = (originalEvent?.target ||
                event.target) as HTMLElement | null;
              if (
                target &&
                (target.closest("[data-radix-popover-content]") ||
                  target.closest("[data-radix-dropdown-menu-content]") ||
                  target.closest("[data-radix-dropdown-menu-sub-content]") ||
                  target.closest(".click-outside-ignore"))
              ) {
                event.preventDefault();
              }
            }}
            side="bottom"
            style={
              {
                "--gdg-popover-width": dropdownWidth
                  ? `${dropdownWidth}px`
                  : "auto",
                maxWidth: POPUP_MAX_WIDTH_STYLE,
              } as React.CSSProperties
            }
          >
            <PhoneNumberSelectorContent
              addPreviewDisplay={addPreviewDisplay}
              allowCreateNew={allowCreateNew}
              canCreateNew={canCreateNew}
              groups={phoneGroups}
              isLocalized={isLocalized}
              onCreateNew={handleCreateNewPhone}
              onSelect={handleSelectFromDropdown}
              search={phoneSearch}
              selectedPhone={selectedPhone}
              selectedRef={selectedPhoneRef}
              setSearch={setPhoneSearch}
            />
          </PopoverContent>
        </Popover>
      </ButtonGroup>
    </div>
  );
};

export default GridPhoneCombobox;
