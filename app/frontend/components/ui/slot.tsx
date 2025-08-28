"use client";

import * as React from "react";

type SlotProps = React.HTMLAttributes<HTMLElement> & {
	children?: React.ReactNode;
};

function composeRefs<T>(
	...refs: Array<React.Ref<T> | undefined | null>
): React.RefCallback<T> {
	return (node: T) => {
		for (const ref of refs) {
			if (!ref) continue;
			if (typeof ref === "function") {
				ref(node);
			} else {
				try {
					// @ts-expect-error: writeable .current
					ref.current = node;
				} catch {
					// ignore
				}
			}
		}
	};
}

// Minimal Slot implementation to replace @radix-ui/react-slot
export const Slot = React.forwardRef<HTMLElement, SlotProps>((props, ref) => {
	const { children, ...rest } = props;
	if (React.isValidElement(children)) {
		const childElement = children as React.ReactElement<any>;
		const childProps = (childElement.props as any) ?? {};
		const childRef = childProps.ref as React.Ref<HTMLElement> | undefined;
		const mergedProps: any = { ...rest, ref: composeRefs(childRef, ref) };
		return React.cloneElement(childElement as any, mergedProps);
	}
	return null;
});
Slot.displayName = "Slot";

export default Slot;
