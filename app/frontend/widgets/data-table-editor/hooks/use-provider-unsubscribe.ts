import { useEffect } from "react";

type ProviderWithUnsubscribe = {
	unsubscribe?: () => void;
};

export function useProviderUnsubscribe(
	dataProviderRef: React.RefObject<ProviderWithUnsubscribe | null>
) {
	useEffect(
		() => () => {
			const provider = dataProviderRef.current;
			if (provider?.unsubscribe) {
				provider.unsubscribe();
			}
		},
		[dataProviderRef]
	);
}
