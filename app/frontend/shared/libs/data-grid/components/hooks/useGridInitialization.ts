import type { GridColumn } from '@glideapps/glide-data-grid'
import React from 'react'
import { GRID_STATE_STORAGE_KEY } from '../../core/constants/grid'
import { computeHasPersistedState } from '../../core/selectors/gridSelectors'
import { createLocalStorageGridStateStorage } from '../../infrastructure/localStorageGridStateStorage'
import type { IDataSource } from '../core/interfaces/IDataSource'
import type { EditingState } from '../models/editing-state'

type UseGridInitializationOptions = {
	externalDataSource?: IDataSource
	onDataProviderReady?: (provider: unknown) => void
	dataProvider: {
		refresh: () => Promise<void>
		getEditingState: () => EditingState
	}
	columnsState: GridColumn[]
	loadState: () => void
	dataSource: IDataSource
	setGridKey: React.Dispatch<React.SetStateAction<number>>
	gs: {
		setNumRows: (rows: number) => void
	}
	setIsInitializing: React.Dispatch<React.SetStateAction<boolean>>
	setIsDataReady: React.Dispatch<React.SetStateAction<boolean>>
}

export function useGridInitialization({
	externalDataSource,
	onDataProviderReady,
	dataProvider,
	columnsState,
	loadState,
	dataSource,
	setGridKey,
	gs,
	setIsInitializing,
	setIsDataReady,
}: UseGridInitializationOptions) {
	const [isStateLoaded, setIsStateLoaded] = React.useState(false)

	const storage = React.useMemo(() => createLocalStorageGridStateStorage(), [])
	const hasPersistedState = React.useMemo(() => {
		if (externalDataSource) {
			return false
		}
		return computeHasPersistedState(storage, GRID_STATE_STORAGE_KEY)
	}, [externalDataSource, storage])

	// Load persisted state on first render
	React.useEffect(() => {
		if (!isStateLoaded && columnsState.length > 0) {
			if (hasPersistedState && !externalDataSource) {
				loadState()
				dataProvider.refresh().then(() => {
					setGridKey((prev) => prev + 1)
					setIsStateLoaded(true)
					setIsDataReady(true)
					const INITIALIZE_DELAY_MS = 100
					setTimeout(() => setIsInitializing(false), INITIALIZE_DELAY_MS)
				})
			} else {
				setIsStateLoaded(true)
				setIsDataReady(true)
				setIsInitializing(false)
			}
		}
	}, [
		loadState,
		dataProvider,
		isStateLoaded,
		columnsState.length,
		hasPersistedState,
		externalDataSource,
		setGridKey,
		setIsDataReady,
		setIsInitializing,
	])

	// Notify consumer when provider is ready
	React.useEffect(() => {
		if (dataProvider && onDataProviderReady) {
			onDataProviderReady(dataProvider)
		}
	}, [dataProvider, onDataProviderReady])

	// Sync row count
	React.useEffect(() => {
		gs.setNumRows(dataSource.rowCount)
	}, [dataSource.rowCount, gs])
}
