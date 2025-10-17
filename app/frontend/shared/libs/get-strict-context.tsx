import React, { createContext, type ReactNode, useContext } from "react";

function getStrictContext<T>(
	name?: string
): readonly [
	({
		value,
		children,
	}: {
		value: T;
		children?: ReactNode;
	}) => React.ReactElement,
	() => T,
] {
	const Context = createContext<T | undefined>(undefined);

	const Provider = ({
		value,
		children,
	}: {
		value: T;
		children?: ReactNode;
	}) => <Context.Provider value={value}>{children}</Context.Provider>;

	const useSafeContext = () => {
		const ctx = useContext(Context);
		if (ctx === undefined) {
			throw new Error(`useContext must be used within ${name ?? "a Provider"}`);
		}
		return ctx;
	};

	return [Provider, useSafeContext] as const;
}

export { getStrictContext };
