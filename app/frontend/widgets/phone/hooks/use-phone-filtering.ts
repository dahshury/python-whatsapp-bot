import { CUSTOMERS_SEARCH_EVENT } from "@services/websocket/events";
import type { CustomersSearchEventDetail } from "@services/websocket/types";
import { useCallback, useEffect, useState } from "react";
import type { PhoneOption } from "@/entities/phone";
import type { IndexedPhoneOption } from "@/services/phone/phone-index.service";
import { buildIndexedOptions } from "@/services/phone/phone-index.service";
import { WebSocketService } from "@/services/websocket/websocket.service";

const SEARCH_RESULTS_LIMIT = 25;

type UsePhoneFilteringParams = {
	search: string;
	indexedOptions: IndexedPhoneOption[];
};

export function usePhoneFiltering({
	search,
	indexedOptions,
}: UsePhoneFilteringParams) {
	const [filteredPhones, setFilteredPhones] = useState<PhoneOption[]>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [hasError, setHasError] = useState(false);
	const [_retryNonce, setRetryNonce] = useState(0);
	const [ephemeralOptions, setEphemeralOptions] = useState<PhoneOption[]>([]);

	useEffect(() => {
		const q = (search || "").trim();
		if (!q) {
			// No server search; just show initial options + ephemerals
			setFilteredPhones([
				...ephemeralOptions,
				...(indexedOptions as unknown as PhoneOption[]),
			]);
			setHasError(false);
			return;
		}
		setIsSearching(true);
		const ws = new WebSocketService();
		ws.searchCustomers(q, SEARCH_RESULTS_LIMIT).then((ok) => {
			if (!ok) {
				setHasError(true);
				setIsSearching(false);
			}
		});
		const onResults = (ev: Event) => {
			try {
				const detail = (ev as CustomEvent).detail as CustomersSearchEventDetail;
				if (!detail || (detail.q || "") !== q) {
					return;
				}
				const fromServer: PhoneOption[] = (detail.items || []).map(
					(it: { wa_id?: string; name?: string | null }) => ({
						number: String(it.wa_id || ""),
						name: it.name || "",
						country: "US",
						label: it.name || String(it.wa_id || ""),
						id: String(it.wa_id || ""),
					})
				);
				const merged = buildIndexedOptions(fromServer);
				setFilteredPhones([
					...ephemeralOptions,
					...(merged as unknown as PhoneOption[]),
				]);
				setHasError(false);
			} catch (_error) {
				setHasError(true);
			}
			setIsSearching(false);
		};
		window.addEventListener(CUSTOMERS_SEARCH_EVENT, onResults as EventListener);
		return () => {
			window.removeEventListener(
				CUSTOMERS_SEARCH_EVENT,
				onResults as EventListener
			);
		};
	}, [search, indexedOptions, ephemeralOptions]);

	const addEphemeralOption = useCallback((option: PhoneOption) => {
		setEphemeralOptions((prev) => [option, ...prev]);
		setFilteredPhones((prev) => [option, ...prev]);
	}, []);

	const retry = useCallback(() => {
		setHasError(false);
		setIsSearching(true);
		setRetryNonce((n) => n + 1);
	}, []);

	return {
		filteredPhones,
		isSearching,
		hasError,
		retry,
		addEphemeralOption,
	} as const;
}
