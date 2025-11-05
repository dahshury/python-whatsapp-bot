import type * as RPNInput from "react-phone-number-input";
import type { PhoneOption } from "@/entities/phone";

export type IndexedPhoneOption = PhoneOption & {
  displayNumber: string;
  __normalizedNumber: string;
  __searchName: string;
  __searchLabel: string;
  __country: RPNInput.Country;
};
