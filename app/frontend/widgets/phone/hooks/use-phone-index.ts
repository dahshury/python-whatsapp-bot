import { useMemo } from "react";
import type { PhoneOption } from "@/entities/phone";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import { buildIndexedOptions } from "@/services/phone/phone-index.service";

export function usePhoneIndex(phoneOptions: PhoneOption[]) {
	const indexedOptions: IndexedPhoneOption[] = useMemo(
		() => buildIndexedOptions(phoneOptions),
		[phoneOptions]
	);

	return { indexedOptions } as const;
}
