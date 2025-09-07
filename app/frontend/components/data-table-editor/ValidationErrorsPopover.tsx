"use client";

import {
	AtSignIcon,
	ChevronDownIcon,
	CircleDashedIcon,
	CommandIcon,
	EclipseIcon,
	GaugeIcon,
	type LucideIcon,
	ZapIcon,
} from "lucide-react";
import * as React from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

// Phone validation libraries are available but not used directly in the popover
// since we only have error messages, not actual phone values

// Using LucideIcon type from lucide-react for proper typing

export interface ValidationErrorItem {
	row: number;
	col: number;
	message: string;
	fieldName?: string;
}

interface ValidationErrorsPopoverProps {
	errors: ValidationErrorItem[];
	triggerClassName?: string;
}

const fieldIcon: Record<string, LucideIcon> = {
	scheduled_time: GaugeIcon,
	phone: AtSignIcon,
	type: CommandIcon,
	name: EclipseIcon,
};

function formatFieldLabel(field?: string, isLocalized?: boolean): string {
	const f = String(field || "").toLowerCase();
	const key = `field_${f}`;
	const label = i18n.getMessage(key, isLocalized);
	return label || f.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

// Phone validation hints are handled by matching error message patterns
// The actual phone validation is done in PhoneColumnType.ts using libphonenumber-js

function getViolatedRuleHints(_err: ValidationErrorItem): string[] {
	// All translations are handled by global i18n; show exact error message above.
	return [];
}

export function ValidationErrorsPopover(props: ValidationErrorsPopoverProps) {
	const { errors, triggerClassName } = props;
	const { isLocalized } = useLanguage();
	const [open, setOpen] = React.useState(false);

	const grouped = React.useMemo(() => {
		const map = new Map<number, ValidationErrorItem[]>();
		for (const e of errors) {
			const arr = map.get(e.row) || [];
			arr.push(e);
			map.set(e.row, arr);
		}
		return Array.from(map.entries())
			.sort((a, b) => a[0] - b[0])
			.map(([row, list]) => ({ row, list }));
	}, [errors]);

	const title = i18n.getMessage("validation_issues", isLocalized);
	const rowLabel = (rowIdx: number) =>
		`${i18n.getMessage("row", isLocalized)} ${rowIdx + 1}`;

	if (!errors || errors.length === 0) return null;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className={cn(
						"inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
						triggerClassName,
					)}
					aria-label={title}
				>
					{errors.length}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align={isLocalized ? "end" : "start"}
				sideOffset={8}
				className="w-96 p-0"
			>
				<div className="p-3 border-b">
					<div className="flex items-center gap-2">
						<ZapIcon className="h-4 w-4 text-destructive" />
						<h3 className="text-sm font-semibold">{title}</h3>
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{i18n.getMessage("validation_issues_details", isLocalized)}
					</p>
				</div>
				<div className="max-h-80 overflow-auto">
					<Accordion type="multiple" className="w-full">
						{grouped.map(({ row, list }) => (
							<AccordionItem key={row} value={`row-${row}`} className="px-2">
								<AccordionTrigger className="justify-start gap-3 px-2 [&>svg]:-order-1">
									<span className="flex items-center gap-2">
										<CircleDashedIcon
											size={16}
											className="shrink-0 text-destructive"
											aria-hidden="true"
										/>
										<span className="text-[13px] font-medium">
											{rowLabel(row)} ({list.length})
										</span>
									</span>
								</AccordionTrigger>
								<AccordionContent className="p-0">
									{list.map((err) => {
										const key = `${row}-${String(err.fieldName || "").toLowerCase()}-${err.col}-${String(err.message || "").slice(0, 64)}`;
										const field = String(err.fieldName || "").toLowerCase();
										const Icon = fieldIcon[field] || CircleDashedIcon;
										return (
											<Collapsible
												key={key}
												className="border-t py-2 ps-6 pe-3"
												defaultOpen={false}
											>
												<CollapsibleTrigger className="flex w-full gap-2 text-[13px] leading-6 font-semibold [&[data-state=open]>svg]:rotate-180">
													<ChevronDownIcon
														size={16}
														className="mt-0.5 shrink-0 opacity-60 transition-transform duration-200"
														aria-hidden={true}
													/>
													<span className="flex items-center gap-2">
														<Icon
															size={16}
															className="shrink-0 opacity-70"
															aria-hidden={true}
														/>
														<span className="truncate">
															{formatFieldLabel(err.fieldName, isLocalized)}
														</span>
													</span>
												</CollapsibleTrigger>
												<CollapsibleContent className="text-muted-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down mt-1 overflow-hidden ps-6 text-[12px]">
													<p className="leading-5 mb-1">{err.message}</p>
													{getViolatedRuleHints(err).length > 0 && (
														<ul className="list-disc ms-4">
															{getViolatedRuleHints(err).map((hint) => (
																<li key={`${field}-${hint}`}>{hint}</li>
															))}
														</ul>
													)}
												</CollapsibleContent>
											</Collapsible>
										);
									})}
								</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</PopoverContent>
		</Popover>
	);
}
