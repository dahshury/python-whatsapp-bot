"use client";

import { Check } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

// Simple dropdown menu implementation without external dependencies
interface DropdownMenuProps {
	children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
	asChild?: boolean;
	children: React.ReactNode;
	className?: string;
}

interface DropdownMenuContentProps {
	align?: "start" | "center" | "end";
	side?: "top" | "right" | "bottom" | "left";
	className?: string;
	children: React.ReactNode;
}

interface DropdownMenuItemProps {
	className?: string;
	children: React.ReactNode;
	onClick?: () => void;
	disabled?: boolean;
}

interface DropdownMenuCheckboxItemProps {
	className?: string;
	children: React.ReactNode;
	checked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	disabled?: boolean;
}

interface DropdownMenuSeparatorProps {
	className?: string;
}

const DropdownMenuContext = React.createContext<{
	open: boolean;
	setOpen: (open: boolean) => void;
}>({
	open: false,
	setOpen: () => {},
});

const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
	const [open, setOpen] = React.useState(false);

	React.useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			if (!target.closest("[data-dropdown-menu]")) {
				setOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpen(false);
			}
		};

		if (open) {
			document.addEventListener("mousedown", handleClickOutside);
			document.addEventListener("keydown", handleEscape);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [open]);

	return (
		<DropdownMenuContext.Provider value={{ open, setOpen }}>
			<div className="relative" data-dropdown-menu>
				{children}
			</div>
		</DropdownMenuContext.Provider>
	);
};

const DropdownMenuTrigger = React.forwardRef<
	HTMLButtonElement,
	DropdownMenuTriggerProps
>(({ asChild, children, className, ...props }, ref) => {
	const { open, setOpen } = React.useContext(DropdownMenuContext);

	const handleClick = () => {
		setOpen(!open);
	};

	if (asChild) {
		return React.cloneElement(children as React.ReactElement, {
			onClick: handleClick,
			"aria-expanded": open,
			"aria-haspopup": "menu",
		});
	}

	return (
		<button
			ref={ref}
			type="button"
			className={cn(
				"inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
				className,
			)}
			onClick={handleClick}
			aria-expanded={open}
			aria-haspopup="menu"
			{...props}
		>
			{children}
		</button>
	);
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

const DropdownMenuContent = React.forwardRef<
	HTMLDivElement,
	DropdownMenuContentProps
>(
	(
		{ align = "center", side = "bottom", className, children, ...props },
		ref,
	) => {
		const { open } = React.useContext(DropdownMenuContext);

		if (!open) return null;

		const alignmentClasses = {
			start: "left-0",
			center: "left-1/2 -translate-x-1/2",
			end: "right-0",
		};

		const sideClasses = {
			top: "bottom-full mb-2",
			right: "left-full ml-2 top-0",
			bottom: "top-full mt-2",
			left: "right-full mr-2 top-0",
		};

		return (
			<div
				ref={ref}
				className={cn(
					"absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
					"animate-in fade-in-0 zoom-in-95",
					side === "bottom" && "slide-in-from-top-2",
					side === "top" && "slide-in-from-bottom-2",
					side === "right" && "slide-in-from-left-2",
					side === "left" && "slide-in-from-right-2",
					sideClasses[side],
					alignmentClasses[align],
					className,
				)}
				role="menu"
				{...props}
			>
				{children}
			</div>
		);
	},
);
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
	HTMLDivElement,
	DropdownMenuItemProps
>(({ className, children, onClick, disabled, ...props }, ref) => {
	const { setOpen } = React.useContext(DropdownMenuContext);

	const handleClick = () => {
		if (!disabled && onClick) {
			onClick();
			setOpen(false);
		}
	};

	return (
		<div
			ref={ref}
			className={cn(
				"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground",
				disabled && "pointer-events-none opacity-50",
				!disabled &&
					"hover:bg-accent hover:text-accent-foreground cursor-pointer",
				className,
			)}
			onClick={handleClick}
			role="menuitem"
			tabIndex={disabled ? -1 : 0}
			onKeyDown={(e) => {
				if (!disabled && (e.key === "Enter" || e.key === " ")) {
					e.preventDefault();
					handleClick();
				}
			}}
			{...props}
		>
			{children}
		</div>
	);
});
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuCheckboxItem = React.forwardRef<
	HTMLDivElement,
	DropdownMenuCheckboxItemProps
>(
	(
		{ className, children, checked, onCheckedChange, disabled, ...props },
		ref,
	) => {
		// no need to read setOpen here since we don't close on toggle

		const handleClick = () => {
			if (!disabled && onCheckedChange) {
				onCheckedChange(!checked);
			}
		};

		return (
			<div
				ref={ref}
				className={cn(
					"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground",
					disabled && "pointer-events-none opacity-50",
					!disabled &&
						"hover:bg-accent hover:text-accent-foreground cursor-pointer",
					className,
				)}
				onClick={handleClick}
				role="menuitemcheckbox"
				aria-checked={!!checked}
				tabIndex={disabled ? -1 : 0}
				onKeyDown={(e) => {
					if (!disabled && (e.key === "Enter" || e.key === " ")) {
						e.preventDefault();
						handleClick();
					}
				}}
				{...props}
			>
				<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
					{checked && <Check className="h-4 w-4" />}
				</span>
				{children}
			</div>
		);
	},
);
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem";

const DropdownMenuSeparator = React.forwardRef<
	HTMLDivElement,
	DropdownMenuSeparatorProps
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn("-mx-1 my-1 h-px bg-border", className)}
		{...props}
	/>
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuSeparator,
};
