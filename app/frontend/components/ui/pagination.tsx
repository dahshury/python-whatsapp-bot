"use client";

import type * as React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
	<nav className={cn("mx-auto w-full", className)} {...props} />
);
Pagination.displayName = "Pagination";

const PaginationContent = ({
	className,
	...props
}: React.ComponentProps<"ul">) => (
	<ul
		className={cn("flex flex-row items-center gap-1", className)}
		{...props}
	/>
);
PaginationContent.displayName = "PaginationContent";

const PaginationItem = ({
	className,
	...props
}: React.ComponentProps<"li">) => (
	<li className={cn("list-none", className)} {...props} />
);
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = React.ComponentProps<"a"> & { isActive?: boolean };
const baseLink =
	"inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";
const inactiveLink = "border border-transparent hover:bg-muted";
const activeLink = "bg-primary text-primary-foreground";

const PaginationLink = ({
	className,
	isActive,
	...props
}: PaginationLinkProps) => (
	<a
		className={cn(baseLink, isActive ? activeLink : inactiveLink, className)}
		aria-current={isActive ? "page" : undefined}
		{...props}
	/>
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
	className,
	...props
}: React.ComponentProps<"a">) => (
	<a className={cn(baseLink, inactiveLink, className)} {...props}>
		<ChevronLeft className="mr-2 h-4 w-4" />
		<span>Previous</span>
	</a>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({ className, ...props }: React.ComponentProps<"a">) => (
	<a className={cn(baseLink, inactiveLink, className)} {...props}>
		<span>Next</span>
		<ChevronRight className="ml-2 h-4 w-4" />
	</a>
);
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = ({
	className,
	...props
}: React.ComponentProps<"span">) => (
	<span
		className={cn("flex h-9 min-w-9 items-center justify-center", className)}
		aria-hidden
		{...props}
	>
		<MoreHorizontal className="h-4 w-4" />
		<span className="sr-only">More pages</span>
	</span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationPrevious,
	PaginationNext,
	PaginationEllipsis,
};
