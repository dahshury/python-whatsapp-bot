"use client";

import {
	Close as SheetClose,
	Content as SheetContent,
	Description as SheetDescription,
	Overlay as SheetOverlay,
	Portal as SheetPortal,
	Root as SheetRoot,
	Title as SheetTitle,
	Trigger as SheetTrigger,
} from "@radix-ui/react-dialog";
import { cn } from "@shared/libs/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import type * as React from "react";

function Sheet(props: React.ComponentProps<typeof SheetRoot>) {
	return <SheetRoot {...props} />;
}

function SheetTriggerComponent(
	props: React.ComponentProps<typeof SheetTrigger>
) {
	return <SheetTrigger {...props} />;
}

function SheetCloseComponent(props: React.ComponentProps<typeof SheetClose>) {
	return <SheetClose {...props} />;
}

function SheetPortalComponent(props: React.ComponentProps<typeof SheetPortal>) {
	return <SheetPortal {...props} />;
}

const SheetOverlayComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SheetOverlay> & {
	ref?: React.RefObject<React.ElementRef<typeof SheetOverlay> | null>;
}) => (
	<SheetOverlay
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 bg-black/80 data-[state=closed]:animate-out data-[state=open]:animate-in",
			className
		)}
		{...props}
		ref={ref}
	/>
);
SheetOverlayComponent.displayName = SheetOverlay.displayName;

const sheetVariants = cva(
	"fixed gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-300 data-[state=open]:duration-500",
	{
		variants: {
			side: {
				top: "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 border-b",
				bottom:
					"data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 border-t",
				left: "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
				right:
					"data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
			},
		},
		defaultVariants: {
			side: "right",
		},
	}
);

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof SheetContent>,
		VariantProps<typeof sheetVariants> {}

const SheetContentComponent = ({
	side = "right",
	className,
	children,
	ref,
	...props
}: SheetContentProps & {
	ref?: React.RefObject<React.ElementRef<typeof SheetContent> | null>;
}) => (
	<SheetPortalComponent>
		<SheetOverlayComponent />
		<SheetContent
			className={cn(sheetVariants({ side }), className)}
			ref={ref}
			{...props}
		>
			<SheetClose className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
				<X className="h-4 w-4" />
				<span className="sr-only">Close</span>
			</SheetClose>
			{children}
		</SheetContent>
	</SheetPortalComponent>
);
SheetContentComponent.displayName = SheetContent.displayName;

const SheetHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-2 text-center sm:text-left",
			className
		)}
		{...props}
	/>
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			className
		)}
		{...props}
	/>
);
SheetFooter.displayName = "SheetFooter";

const SheetTitleComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SheetTitle> & {
	ref?: React.RefObject<React.ElementRef<typeof SheetTitle> | null>;
}) => (
	<SheetTitle
		className={cn("font-semibold text-foreground text-lg", className)}
		ref={ref}
		{...props}
	/>
);
SheetTitleComponent.displayName = SheetTitle.displayName;

const SheetDescriptionComponent = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithoutRef<typeof SheetDescription> & {
	ref?: React.RefObject<React.ElementRef<typeof SheetDescription> | null>;
}) => (
	<SheetDescription
		className={cn("text-muted-foreground text-sm", className)}
		ref={ref}
		{...props}
	/>
);
SheetDescriptionComponent.displayName = SheetDescription.displayName;

export {
	Sheet,
	SheetCloseComponent as SheetClose,
	SheetContentComponent as SheetContent,
	SheetDescriptionComponent as SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlayComponent as SheetOverlay,
	SheetPortalComponent as SheetPortal,
	SheetTitleComponent as SheetTitle,
	SheetTriggerComponent as SheetTrigger,
};
