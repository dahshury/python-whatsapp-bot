import { useMemo } from "react";
import type { PhoneOption } from "@/entities/phone";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import { getVisiblePhones } from "@/services/phone/phone-search.service";

type UseVisiblePhonesParams = {
	filteredPhones: Array<IndexedPhoneOption | PhoneOption>;
	selectedPhone: string;
	search: string;
	limit: number;
};

export function useVisiblePhones({
	filteredPhones,
	selectedPhone,
	search,
	limit,
}: UseVisiblePhonesParams) {
	const visiblePhones: IndexedPhoneOption[] = useMemo(() => {
		if (!search) {
			return getVisiblePhones(
				filteredPhones as IndexedPhoneOption[],
				selectedPhone,
				limit
			) as IndexedPhoneOption[];
		}
		return filteredPhones as IndexedPhoneOption[];
	}, [filteredPhones, search, selectedPhone, limit]);

	const visiblePhonesWithSelectedFirst: IndexedPhoneOption[] = useMemo(() => {
		const normalize = (s: string) =>
			String(s)
				.replace(/[\s\-+]/g, "")
				.toLowerCase();
		const selectedNorm = normalize(selectedPhone);
		const selectedItem = (visiblePhones || []).find(
			(opt) => normalize(opt.number) === selectedNorm
		);
		if (!selectedItem) {
			return visiblePhones;
		}
		const others = (visiblePhones || []).filter(
			(opt) => normalize(opt.number) !== selectedNorm
		);
		return [selectedItem, ...others];
	}, [visiblePhones, selectedPhone]);

	return { visiblePhones, visiblePhonesWithSelectedFirst } as const;
}
