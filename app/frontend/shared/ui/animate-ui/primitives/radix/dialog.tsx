"use client";

import { useControlledState } from "@shared/libs/hooks/use-controlled-state";
import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import { getStrictContext } from "@/shared/libs/get-strict-context";

type DialogContextType = {
	isOpen: boolean;
	setIsOpen: (isOpen: boolean) => void;
};

const [DialogProvider, useDialog] = getStrictContext<DialogContextType>("DialogContext");

type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

function Dialog(props: DialogProps) {
	const controlledStateProps: {
		value?: boolean;
		defaultValue?: boolean;
		onChange?: (value: boolean) => void;
	} = {};

	if (props?.open !== undefined) {
		controlledStateProps.value = props.open;
	}
	if (props?.defaultOpen !== undefined) {
		controlledStateProps.defaultValue = props.defaultOpen;
	}
	if (props?.onOpenChange !== undefined) {
		controlledStateProps.onChange = props.onOpenChange;
	}

	const [isOpen, setIsOpen] = useControlledState(controlledStateProps);

	return (
		<DialogProvider value={{ isOpen, setIsOpen }}>
			<DialogPrimitive.Root data-slot="dialog" {...props} onOpenChange={setIsOpen} />
		</DialogProvider>
	);
}

type DialogTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;

function DialogTrigger(props: DialogTriggerProps) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

type DialogPortalProps = Omit<React.ComponentProps<typeof DialogPrimitive.Portal>, "forceMount">;

function DialogPortal(props: DialogPortalProps) {
	const { isOpen } = useDialog();

	return (
		<AnimatePresence>
			{isOpen && <DialogPrimitive.Portal data-slot="dialog-portal" forceMount {...props} />}
		</AnimatePresence>
	);
}

type DialogOverlayProps = Omit<React.ComponentProps<typeof DialogPrimitive.Overlay>, "forceMount" | "asChild"> &
	HTMLMotionProps<"div">;

function DialogOverlay({ transition = { duration: 0.2, ease: "easeInOut" }, ...props }: DialogOverlayProps) {
	return (
		<DialogPrimitive.Overlay data-slot="dialog-overlay" asChild forceMount>
			<motion.div
				key="dialog-overlay"
				initial={{ opacity: 0, filter: "blur(4px)" }}
				animate={{ opacity: 1, filter: "blur(0px)" }}
				exit={{ opacity: 0, filter: "blur(4px)" }}
				transition={transition}
				{...props}
			/>
		</DialogPrimitive.Overlay>
	);
}

type DialogFlipDirection = "top" | "bottom" | "left" | "right";

type DialogContentProps = Omit<React.ComponentProps<typeof DialogPrimitive.Content>, "forceMount" | "asChild"> &
	HTMLMotionProps<"div"> & {
		from?: DialogFlipDirection;
	};

function DialogContent({
	from = "top",
	onOpenAutoFocus,
	onCloseAutoFocus,
	onEscapeKeyDown,
	onPointerDownOutside,
	onInteractOutside,
	transition = { type: "spring", stiffness: 150, damping: 25 },
	...props
}: DialogContentProps) {
	const initialRotation = from === "bottom" || from === "left" ? "20deg" : "-20deg";
	const isVertical = from === "top" || from === "bottom";
	const rotateAxis = isVertical ? "rotateX" : "rotateY";

	const contentProps: React.ComponentProps<typeof DialogPrimitive.Content> = {
		asChild: true,
		forceMount: true,
	};

	if (onOpenAutoFocus !== undefined) {
		contentProps.onOpenAutoFocus = onOpenAutoFocus;
	}
	if (onCloseAutoFocus !== undefined) {
		contentProps.onCloseAutoFocus = onCloseAutoFocus;
	}
	if (onEscapeKeyDown !== undefined) {
		contentProps.onEscapeKeyDown = onEscapeKeyDown;
	}
	if (onPointerDownOutside !== undefined) {
		contentProps.onPointerDownOutside = onPointerDownOutside;
	}
	if (onInteractOutside !== undefined) {
		contentProps.onInteractOutside = onInteractOutside;
	}

	return (
		<DialogPrimitive.Content {...contentProps}>
			<motion.div
				key="dialog-content"
				data-slot="dialog-content"
				initial={{
					opacity: 0,
					filter: "blur(4px)",
					transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
				}}
				animate={{
					opacity: 1,
					filter: "blur(0px)",
					transform: `perspective(500px) ${rotateAxis}(0deg) scale(1)`,
				}}
				exit={{
					opacity: 0,
					filter: "blur(4px)",
					transform: `perspective(500px) ${rotateAxis}(${initialRotation}) scale(0.8)`,
				}}
				transition={transition}
				{...props}
			/>
		</DialogPrimitive.Content>
	);
}

type DialogCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;

function DialogClose(props: DialogCloseProps) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

type DialogHeaderProps = React.ComponentProps<"div">;

function DialogHeader(props: DialogHeaderProps) {
	return <div data-slot="dialog-header" {...props} />;
}

type DialogFooterProps = React.ComponentProps<"div">;

function DialogFooter(props: DialogFooterProps) {
	return <div data-slot="dialog-footer" {...props} />;
}

type DialogTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>;

function DialogTitle(props: DialogTitleProps) {
	return <DialogPrimitive.Title data-slot="dialog-title" {...props} />;
}

type DialogDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>;

function DialogDescription(props: DialogDescriptionProps) {
	return <DialogPrimitive.Description data-slot="dialog-description" {...props} />;
}

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogClose,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	useDialog,
	type DialogProps,
	type DialogTriggerProps,
	type DialogPortalProps,
	type DialogCloseProps,
	type DialogOverlayProps,
	type DialogContentProps,
	type DialogHeaderProps,
	type DialogFooterProps,
	type DialogTitleProps,
	type DialogDescriptionProps,
	type DialogContextType,
	type DialogFlipDirection,
};
