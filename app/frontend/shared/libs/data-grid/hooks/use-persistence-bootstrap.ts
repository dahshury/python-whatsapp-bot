import { useEffect, useState } from "react";

type Refreshable = { refresh: () => Promise<void> };

const INITIALIZATION_DELAY_MS = 100;

export function usePersistenceBootstrap({
	columnsStateLength,
	hasPersistedState,
	externalDataSource,
	loadState,
	dataProvider,
}: {
	columnsStateLength: number;
	hasPersistedState: boolean;
	externalDataSource?: unknown;
	loadState: () => void;
	dataProvider: Refreshable;
}) {
	const [gridKey, setGridKey] = useState(0);
	const [isStateLoaded, setIsStateLoaded] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isDataReady, setIsDataReady] = useState(false);

	useEffect(() => {
		if (!isStateLoaded && columnsStateLength > 0) {
			if (hasPersistedState && !externalDataSource) {
				loadState();
				dataProvider.refresh().then(() => {
					setGridKey((prev) => prev + 1);
					setIsStateLoaded(true);
					setIsDataReady(true);
					setTimeout(() => setIsInitializing(false), INITIALIZATION_DELAY_MS);
				});
			} else {
				setIsStateLoaded(true);
				setIsDataReady(true);
				setIsInitializing(false);
			}
		}
	}, [
		columnsStateLength,
		hasPersistedState,
		externalDataSource,
		loadState,
		dataProvider,
		isStateLoaded,
	]);

	return { gridKey, isStateLoaded, isInitializing, isDataReady } as const;
}
