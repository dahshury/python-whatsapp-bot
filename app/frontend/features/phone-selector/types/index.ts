import type React from "react";
import type { IndexedPhoneOption } from "@/shared/libs/phone/indexed.types";
import type { PhoneGroup } from "@/shared/libs/phone/phone-groups";

export type PhoneNumberSelectorBaseProps = {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  groups?: PhoneGroup<IndexedPhoneOption>[];
  selectedPhone?: string;
  selectedRef?: React.RefObject<HTMLDivElement | null>;
  onSelect: (phone: string) => void;
  canCreateNew: boolean;
  onCreateNew: (value: string) => void;
  allowCreateNew: boolean;
  addPreviewDisplay?: string;
  isLocalized: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  isSearching?: boolean;
};
