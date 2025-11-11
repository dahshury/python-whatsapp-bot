# Refactoring Plan: phone-combobox.tsx

## User Objectives

- **Primary Goal**: Code splitting and modularization to resolve file size violation
- **Specific Requirements**: 
  - Reduce file size from 727 lines to under 500 lines (hard limit)
  - Improve maintainability and testability
  - Preserve all existing behavior exactly
  - Follow FSD + DDD + Clean Architecture principles
- **Behavioral Changes**: Preserve all existing behavior - no functional changes

## Current State

- **File**: `app/frontend/shared/ui/phone-combobox.tsx`
- **Size**: 727 lines (CRITICAL VIOLATION - exceeds 500 line hard limit)
- **Issues**: 
  - File size violation (>500 lines)
  - Mixed concerns: state management, business logic, UI rendering, layout calculations
  - Complex handlers: `handleCountrySelect` (77 lines), `handlePhoneSelectControlled` (43 lines)
  - Large `useLayoutEffect` for dropdown width calculation (94 lines)
  - Business logic mixed with UI component
  - Constants scattered throughout file
- **Current behavior**: 
  - Controlled/uncontrolled phone number selection with country selector
  - Backend search integration with debouncing
  - Dynamic dropdown width calculation based on content
  - Text shrink-to-fit functionality
  - Customer auto-fill on selection
  - Country code conversion when country changes

## Proposed Changes

**Refactoring Approach:**

- **Goal-aligned strategy**: Extract business logic, complex calculations, and handlers into separate hooks/services/utilities to reduce main component size while preserving all behavior
- **Scope**: 
  - Extract dropdown width calculation to custom hook
  - Extract phone selection business logic to custom hook
  - Extract country selection business logic to custom hook
  - Extract phone display name logic to utility function
  - Extract constants to config file
  - Simplify main component to focus on composition and UI rendering
- **Behavioral impact**: All existing behavior preserved exactly - same inputs produce same outputs

**Refactoring Constraints:**

- **Move as-is when possible**: Extract exact code blocks verbatim when they fit architecture structure
- **Architectural adaptations allowed**: When architecture requires structural changes, wrap/adapt code while preserving all business logic:
  - Create custom hooks for complex state management and side effects
  - Extract business logic to utilities/services while keeping implementation identical
  - Change call signatures to match hook patterns (but keep implementation identical)
  - Split code across layers as required by `@frontend_structure.mdc`
- **Logic preservation**: Preserve all conditionals, calculations, data transformations, error handling, and business rules exactly
- **Update imports**: Change import paths to use public APIs and maintain correct dependency flow

| Step | Description                  | Source Lines | Target Location                     | Dependencies         | Change Type                    |
| ---- | ---------------------------- | ------------ | ----------------------------------- | -------------------- | ------------------------------ |
| 1    | Extract constants            | 46-57        | `shared/libs/phone/phone-combobox.config.ts` | None                 | Move as-is                     |
| 2    | Extract dropdown width calculation hook | 425-518      | `shared/libs/hooks/use-dropdown-width.ts` | phone-groups, constants | Extract to hook, preserve logic |
| 3    | Extract phone display name utility | 645-663      | `shared/libs/phone/phone-display.ts` | phone-utils, i18n    | Move as-is                     |
| 4    | Extract phone selection business logic hook | 268-332      | `features/phone-selector/hooks/usePhoneComboboxSelection.ts` | phone-utils, validation | Extract to hook, preserve logic |
| 5    | Extract country selection business logic hook | 334-410      | `features/phone-selector/hooks/usePhoneComboboxCountry.ts` | phone-utils, validation | Extract to hook, preserve logic |
| 6    | Extract phone combobox state management hook | 108-259      | `features/phone-selector/hooks/usePhoneComboboxState.ts` | backend search, phone-groups | Extract to hook, preserve logic |
| 7    | Extract trigger display component | 605-688      | `shared/ui/phone/phone-combobox-trigger.tsx` | hooks, utils         | Extract to component, preserve logic |
| 8    | Simplify main PhoneCombobox component | 89-722       | `shared/ui/phone-combobox.tsx` | hooks, components    | Compose hooks/components, preserve behavior |
| 9    | Update public APIs           | -            | Various `index.ts` files            | All above            | Export only                    |

## Detailed Extraction Plan

### Step 1: Extract Constants
**Source**: Lines 46-57
**Target**: `shared/libs/phone/phone-combobox.config.ts`
**Action**: Move all constants to config file
**Dependencies**: None
**Change Type**: Move as-is

### Step 2: Extract Dropdown Width Calculation Hook
**Source**: Lines 425-518
**Target**: `shared/libs/hooks/use-dropdown-width.ts`
**Action**: Extract `useLayoutEffect` logic into `useDropdownWidth` hook
**Dependencies**: 
- `shared/libs/phone/phone-groups` (for orderedPhones type)
- `shared/libs/phone/phone-combobox.config.ts` (for constants)
**Change Type**: Extract to hook, preserve all calculation logic exactly

**Hook Signature**:
```typescript
function useDropdownWidth(
  isOpen: boolean,
  orderedPhones: IndexedPhoneOption[],
  canCreateNew: boolean,
  addPreviewDisplay: string,
  triggerRef: RefObject<HTMLButtonElement>
): number | undefined
```

### Step 3: Extract Phone Display Name Utility
**Source**: Lines 645-663 (inline function)
**Target**: `shared/libs/phone/phone-display.ts`
**Action**: Extract phone display name logic to utility function
**Dependencies**: 
- `shared/libs/utils/phone-utils` (normalizePhone)
- `shared/libs/i18n` (i18n.getMessage)
**Change Type**: Move as-is

**Function Signature**:
```typescript
function getPhoneDisplayName(
  selectedPhone: string,
  phoneOptions: PhoneOption[],
  isLocalized: boolean
): string
```

### Step 4: Extract Phone Selection Business Logic Hook
**Source**: Lines 268-332
**Target**: `features/phone-selector/hooks/usePhoneComboboxSelection.ts`
**Action**: Extract phone selection handlers to custom hook
**Dependencies**:
- `shared/libs/utils/phone-utils` (getCountryFromPhone, normalizePhone)
- `shared/validation/phone` (validatePhoneNumber)
- `entities/phone` (PhoneOption type)
**Change Type**: Extract to hook, preserve all business logic exactly

**Hook Signature**:
```typescript
function usePhoneComboboxSelection(
  selectedPhone: string,
  setSelectedPhone: (phone: string) => void,
  phoneOptions: PhoneOption[],
  uncontrolled: boolean,
  onChange?: (value: string) => void,
  onCustomerSelect?: (phone: string, customerName: string) => void,
  setCountry: (country: RPNInput.Country) => void,
  setIsPhoneOpen: (open: boolean) => void,
  setPhoneSearch: (search: string) => void
): {
  handlePhoneSelectControlled: (phoneNumber: string) => void;
  handleCreateNewPhone: (phoneNumber: string) => void;
  handlePhoneSelectInternal: (phoneNumber: string) => void;
}
```

### Step 5: Extract Country Selection Business Logic Hook
**Source**: Lines 334-410
**Target**: `features/phone-selector/hooks/usePhoneComboboxCountry.ts`
**Action**: Extract country selection handler to custom hook
**Dependencies**:
- `react-phone-number-input` (parsePhoneNumber, getCountryCallingCode)
- `shared/libs/phone/countries` (CALLING_CODES_SORTED)
- `shared/libs/utils/phone-utils` (validation)
**Change Type**: Extract to hook, preserve all conversion logic exactly

**Hook Signature**:
```typescript
function usePhoneComboboxCountry(
  selectedPhone: string,
  setSelectedPhone: (phone: string) => void,
  uncontrolled: boolean,
  onChange?: (value: string) => void,
  validatePhone: (phone: string) => { isValid: boolean; error?: string }
): {
  handleCountrySelect: (selectedCountry: RPNInput.Country) => void;
}
```

### Step 6: Extract Phone Combobox State Management Hook
**Source**: Lines 108-259
**Target**: `features/phone-selector/hooks/usePhoneComboboxState.ts`
**Action**: Extract state management, search logic, and data transformation to hook
**Dependencies**:
- `features/phone-selector/hooks/useBackendPhoneSearch`
- `shared/libs/phone/phone-groups` (buildPhoneGroups)
- `shared/libs/phone/phone-index` (buildIndexedOptions)
- `shared/libs/phone/search` (canCreateNewPhone, getAddPreviewDisplay)
**Change Type**: Extract to hook, preserve all state logic exactly

**Hook Signature**:
```typescript
function usePhoneComboboxState(
  phoneOptions: PhoneOption[],
  phoneSearch: string,
  selectedPhone: string,
  country: RPNInput.Country | undefined,
  allowCreateNew: boolean,
  isLocalized: boolean
): {
  localIndexedOptions: IndexedPhoneOption[];
  indexedOptions: IndexedPhoneOption[];
  phoneGroups: PhoneGroup[];
  orderedPhones: IndexedPhoneOption[];
  availableCountries: Set<RPNInput.Country>;
  isSearching: boolean;
  searchError: boolean;
  canCreateNew: boolean;
  addPreviewDisplay: string;
}
```

### Step 7: Extract Trigger Display Component
**Source**: Lines 605-688
**Target**: `shared/ui/phone/phone-combobox-trigger.tsx`
**Action**: Extract trigger button JSX to separate component
**Dependencies**:
- `shared/libs/hooks/use-shrink-to-fit-text`
- `shared/libs/phone/phone-display` (getPhoneDisplayName)
- `shared/libs/utils/phone-utils` (getCountryCallingCode)
**Change Type**: Extract to component, preserve all rendering logic exactly

**Component Props**:
```typescript
type PhoneComboboxTriggerProps = {
  selectedPhone: string;
  phoneOptions: PhoneOption[];
  placeholder: string;
  country?: RPNInput.Country;
  preferPlaceholderWhenEmpty: boolean;
  showNameAndPhoneWhenClosed: boolean;
  shrinkTextToFit: boolean;
  isLocalized: boolean;
  isPhoneOpen: boolean;
  disabled: boolean;
  size: "sm" | "default" | "lg";
  rounded: boolean;
  showCountrySelector: boolean;
  onMouseEnter?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  triggerRef: RefObject<HTMLButtonElement>;
  textContainerRef: RefObject<HTMLDivElement>;
  textRef: RefObject<HTMLSpanElement>;
  textScale: number;
  isMeasured: boolean;
};
```

### Step 8: Simplify Main PhoneCombobox Component
**Source**: Lines 89-722
**Target**: `shared/ui/phone-combobox.tsx`
**Action**: Refactor main component to compose hooks and sub-components
**Dependencies**: All extracted hooks and components
**Change Type**: Compose hooks/components, preserve all behavior exactly

**Expected Result**: Main component reduced to ~200-250 lines focusing on:
- Props destructuring and defaults
- Hook composition
- JSX composition
- Event handler wiring

### Step 9: Update Public APIs
**Target**: Various `index.ts` files
**Action**: Export new hooks and utilities through public APIs
**Files to Update**:
- `features/phone-selector/hooks/index.ts` - export new hooks
- `shared/libs/hooks/index.ts` - export useDropdownWidth
- `shared/libs/phone/index.ts` - export phone-display utilities
- `shared/ui/phone/index.ts` - export PhoneComboboxTrigger

## Expected Outcomes

- **Goal metrics**: 
  - Main component reduced from 727 lines to ~200-250 lines
  - File size compliance: All files under 500 line limit
  - Files created: ~8 new files (hooks, utilities, components)
  - Complexity reduction: Business logic separated from UI rendering
- **Code organization**: 
  - Business logic in `features/phone-selector/hooks/`
  - UI utilities in `shared/libs/hooks/` and `shared/libs/phone/`
  - UI components in `shared/ui/phone/`
  - Constants in `shared/libs/phone/phone-combobox.config.ts`
- **Architectural compliance**: 
  - Hooks in features layer (application business rules)
  - Utilities in shared layer (framework-agnostic)
  - Components in shared/ui (design system)
  - Dependency flow: shared → features → shared/ui (correct)
- **Behavioral validation**: 
  - All existing functionality preserved
  - Same props interface
  - Same event handlers
  - Same visual appearance
  - Same state management behavior

## Verification Steps

- [ ] TypeScript compiles without errors
- [ ] All tests pass (if any exist)
- [ ] File size compliance: Main component < 500 lines
- [ ] File size compliance: All extracted files < their respective limits
- [ ] Import boundaries respected (see `@frontend_structure.mdc`)
- [ ] No circular dependencies
- [ ] Behavioral preservation: Component behaves identically to original
- [ ] Public APIs updated: All exports available through index.ts files
- [ ] Linter passes: `npx biome check .`
- [ ] Type checking passes: `pnpm tsc --noEmit`

## Risk Assessment

**Low Risk**:
- Constants extraction (Step 1)
- Utility function extraction (Step 3)
- Public API updates (Step 9)

**Medium Risk**:
- Dropdown width hook extraction (Step 2) - complex calculation logic
- State management hook extraction (Step 6) - multiple dependencies

**Higher Risk**:
- Phone selection hook extraction (Step 4) - complex business logic with side effects
- Country selection hook extraction (Step 5) - complex conversion logic
- Trigger component extraction (Step 7) - complex JSX with multiple refs

**Mitigation Strategy**:
- Extract code verbatim first, then verify behavior matches
- Test each extraction step independently
- Preserve all error handling and edge cases
- Maintain exact same function signatures and behavior
- Use TypeScript to catch interface mismatches early

