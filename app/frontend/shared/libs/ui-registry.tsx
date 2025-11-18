'use client'

import {
	type ComponentType,
	createContext,
	type ReactNode,
	useContext,
	useMemo,
} from 'react'

export type UiComponentToken = string

export type UiComponentType<TProps> = ComponentType<TProps>

export type UiRegistryMap = Partial<Record<string, UiComponentType<unknown>>>

export type UiCompositeOverride = Record<string, ComponentType<unknown>>
export type UiCompositeRegistryMap = Partial<
	Record<string, UiCompositeOverride>
>

type UiRegistryContextValue = {
	components: UiRegistryMap
	composites: UiCompositeRegistryMap
}

const UiRegistryContext = createContext<UiRegistryContextValue | null>(null)

export function UiProvider({
	components,
	composites,
	children,
}: {
	components?: UiRegistryMap
	composites?: UiCompositeRegistryMap
	children: ReactNode
}) {
	const value = useMemo<UiRegistryContextValue>(
		() => ({ components: components ?? {}, composites: composites ?? {} }),
		[components, composites]
	)

	return (
		<UiRegistryContext.Provider value={value}>
			{children}
		</UiRegistryContext.Provider>
	)
}

export function useUiRegistry(): UiRegistryContextValue {
	const ctx = useContext(UiRegistryContext)
	if (!ctx) {
		return { components: {}, composites: {} }
	}
	return ctx
}

export function useUiOverride<TProps>(
	token: UiComponentToken,
	fallback: UiComponentType<TProps>
): UiComponentType<TProps> {
	const { components } = useUiRegistry()
	const override = (components as Record<string, UiComponentType<TProps>>)[
		token
	]
	return (override as UiComponentType<TProps>) ?? fallback
}

export function useUiCompositeOverride(token: string): UiCompositeOverride {
	const { composites } = useUiRegistry()
	const override = composites[token]
	return override ?? {}
}
