import { useMemo } from "react";
import type * as RPNInput from "react-phone-number-input";
import { getCountryCallingCode } from "react-phone-number-input";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import {
	canCreateNewPhone,
	getAddPreviewDisplay,
} from "@/services/phone/phone-search.service";

type UsePhoneCreateNewParams = {
	search: string;
	country: RPNInput.Country | undefined;
	allowCreateNew: boolean;
	indexedOptions: IndexedPhoneOption[];
};

export function usePhoneCreateNew({
	search,
	country,
	allowCreateNew,
	indexedOptions,
}: UsePhoneCreateNewParams) {
	const addPreviewDisplay = useMemo(
		() =>
			getAddPreviewDisplay(search, country as unknown as string, (c: string) =>
				String(getCountryCallingCode(c as unknown as RPNInput.Country))
			),
		[search, country]
	);

	const canCreateNew = useMemo(
		() => canCreateNewPhone(allowCreateNew, search, indexedOptions),
		[allowCreateNew, search, indexedOptions]
	);

	return { addPreviewDisplay, canCreateNew } as const;
}
