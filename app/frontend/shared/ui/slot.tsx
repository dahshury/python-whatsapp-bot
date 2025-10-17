"use client";

import {
	cloneElement,
	type HTMLAttributes,
	isValidElement,
	type ReactElement,
} from "react";

type SlotProps = HTMLAttributes<HTMLElement> & {
	children?: ReactElement;
};

function composeRefs<T>(
	...refs: Array<React.Ref<T> | undefined | null>
): React.RefCallback<T> {
	return (node: T) => {
		for (const ref of refs) {
			if (!ref) {
				continue;
			}
			if (typeof ref === "function") {
				ref(node);
			} else {
				try {
					(ref as { current: T | null }).current = node;
				} catch {
					// ignore
				}
			}
		}
	};
}

// Minimal Slot implementation to replace @radix-ui/react-slot
export const Slot = ({
	ref,
	...props
}: SlotProps & { ref?: React.RefObject<HTMLElement | null> }) => {
	const { children, ...rest } = props;
	if (isValidElement(children)) {
		const childElement = children as ReactElement;
		const childProps = (childElement.props ?? {}) as Record<string, unknown>;
		const childRef = childProps.ref as React.Ref<HTMLElement> | undefined;
		const mergedProps: Record<string, unknown> & {
			ref: React.RefCallback<HTMLElement> | React.Ref<HTMLElement>;
		} = { ...rest, ref: composeRefs(childRef, ref) };
		return cloneElement(childElement, mergedProps);
	}
	return null;
};
Slot.displayName = "Slot";
