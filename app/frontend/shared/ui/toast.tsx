"use client";

import {
	Action as ToastAction,
	Close as ToastClose,
	Description as ToastDescription,
	Provider as ToastProvider,
	Root as ToastRoot,
	Title as ToastTitle,
	Viewport as ToastViewport,
} from "@radix-ui/react-toast";
import { cn } from "@shared/libs/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type * as React from "react";

const ToastProviderComponent = ToastProvider;

const ToastViewportComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToastViewport> & {
	ref?: React.RefObject<React.ElementRef<typeof ToastViewport> | null>;
}) => (
	<ToastViewport
		className={cn(
			"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[26.25rem]",
			className
		)}
		ref={ref}
		{...props}
	/>
);
ToastViewportComponent.displayName = ToastViewport.displayName;

const toastVariants = cva(
	"group data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[state=closed]:animate-out data-[state=open]:animate-in data-[swipe=end]:animate-out data-[swipe=move]:transition-none",
	{
		variants: {
			variant: {
				default: "border bg-background text-foreground",
				destructive:
					"destructive group border-destructive bg-destructive text-destructive-foreground",
				success:
					"success group border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	}
);

const Toast = ({
	className,
	variant,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToastRoot> &
	VariantProps<typeof toastVariants> & {
		ref?: React.RefObject<React.ElementRef<typeof ToastRoot> | null>;
	}) => (
	<ToastRoot
		className={cn(toastVariants({ variant }), className)}
		ref={ref}
		{...props}
	/>
);
Toast.displayName = ToastRoot.displayName;

const ToastActionComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToastAction> & {
	ref?: React.RefObject<React.ElementRef<typeof ToastAction> | null>;
}) => (
	<ToastAction
		className={cn(
			"inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 font-medium text-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:focus:ring-destructive group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground",
			className
		)}
		ref={ref}
		{...props}
	/>
);
ToastActionComponent.displayName = ToastAction.displayName;

const ToastCloseComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToastClose> & {
	ref?: React.RefObject<React.ElementRef<typeof ToastClose> | null>;
}) => (
	<ToastClose
		className={cn(
			"absolute top-1 right-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600 group-[.destructive]:hover:text-red-50",
			className
		)}
		ref={ref}
		toast-close=""
		{...props}
	>
		<X className="h-4 w-4" />
	</ToastClose>
);
ToastCloseComponent.displayName = ToastClose.displayName;

const ToastTitleComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToastTitle> & {
	ref?: React.RefObject<React.ElementRef<typeof ToastTitle> | null>;
}) => (
	<ToastTitle
		className={cn("font-semibold text-sm [&+div]:text-xs", className)}
		ref={ref}
		{...props}
	/>
);
ToastTitleComponent.displayName = ToastTitle.displayName;

const ToastDescriptionComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof ToastDescription> & {
	ref?: React.RefObject<React.ElementRef<typeof ToastDescription> | null>;
}) => (
	<ToastDescription
		className={cn("text-sm opacity-90", className)}
		ref={ref}
		{...props}
	/>
);
ToastDescriptionComponent.displayName = ToastDescription.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
	Toast,
	ToastActionComponent as ToastAction,
	type ToastActionElement,
	ToastCloseComponent as ToastClose,
	ToastDescriptionComponent as ToastDescription,
	type ToastProps,
	ToastProviderComponent as ToastProvider,
	ToastTitleComponent as ToastTitle,
	ToastViewportComponent as ToastViewport,
};
