"use client";

import {
  cloneElement,
  type HTMLAttributes,
  isValidElement,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefCallback,
  type RefObject,
} from "react";

type SlotProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): RefCallback<T> {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) {
        continue;
      }
      if (typeof ref === "function") {
        ref(node);
      } else {
        try {
          (ref as MutableRefObject<T>).current = node;
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
}: SlotProps & { ref?: RefObject<HTMLElement | null> }) => {
  const { children, ...rest } = props;
  if (isValidElement(children)) {
    const childElement = children as ReactElement;
    const childProps = (childElement.props ?? {}) as Record<string, unknown>;
    const childRef = childProps.ref as Ref<HTMLElement> | undefined;
    const mergedProps: Record<string, unknown> & {
      ref: RefCallback<HTMLElement> | Ref<HTMLElement>;
    } = { ...rest, ref: composeRefs(childRef, ref) };
    return cloneElement(childElement, mergedProps);
  }
  return null;
};
Slot.displayName = "Slot";
