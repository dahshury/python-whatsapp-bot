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
					(ref as React.MutableRefObject<T>).current = node;
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
		const childElement = children as React.ReactElement;
		const childProps = (childElement.props ?? {}) as Record<string, unknown>;
		const childRef = childProps.ref as React.Ref<HTMLElement> | undefined;
		const mergedProps: Record<string, unknown> & {
			ref: React.RefCallback<HTMLElement> | React.Ref<HTMLElement>;
		} = { ...rest, ref: composeRefs(childRef, ref) };
		return React.cloneElement(childElement, mergedProps);
	}
	return null;
});
Slot.displayName = "Slot";
