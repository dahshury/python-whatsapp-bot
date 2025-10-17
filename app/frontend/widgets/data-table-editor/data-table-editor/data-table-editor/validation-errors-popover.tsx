"use client";

import { useLanguage } from "@shared/libs/state/language-context";
import { cn } from "@shared/libs/utils";
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
import { useMemo, useState } from "react";
import { i18n } from "@/shared/libs/i18n";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/shared/ui/animate-ui/components/radix/accordion";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/shared/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

// Phone validation libraries are available but not used directly in the popover
// since we only have error messages, not actual phone values

// Using LucideIcon type from lucide-react for proper typing

const ERROR_MESSAGE_PREVIEW_LENGTH = 64;

export type ValidationErrorItem = {
	row: number;
	col: number;
	message: string;
	fieldName?: string;
};

type ValidationErrorsPopoverProps = {
	errors: ValidationErrorItem[];
	triggerClassName?: string;
};

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
	const [open, setOpen] = useState(false);

	const grouped = useMemo(() => {
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

	if (!errors || errors.length === 0) {
		return null;
	}

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					aria-label={title}
					className={cn(
						"inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 font-bold text-[0.625rem] text-destructive-foreground leading-none shadow outline-none focus-visible:ring-2 focus-visible:ring-ring",
						triggerClassName
					)}
					type="button"
				>
					{errors.length}
				</button>
			</PopoverTrigger>
			<PopoverContent
				align={isLocalized ? "end" : "start"}
				className="w-96 p-0"
				sideOffset={8}
			>
				<div className="border-b p-3">
					<div className="flex items-center gap-2">
						<ZapIcon className="h-4 w-4 text-destructive" />
						<h3 className="font-semibold text-sm">{title}</h3>
					</div>
					<p className="mt-1 text-muted-foreground text-xs">
						{i18n.getMessage("validation_issues_details", isLocalized)}
					</p>
				</div>
				<div className="max-h-80 overflow-auto">
					<Accordion className="w-full" type="multiple">
						{grouped.map(({ row, list }) => (
							<AccordionItem className="px-2" key={row} value={`row-${row}`}>
								<AccordionTrigger className="[&>svg]:-order-1 justify-start gap-3 px-2">
									<span className="flex items-center gap-2">
										<CircleDashedIcon
											aria-hidden="true"
											className="shrink-0 text-destructive"
											size={16}
										/>
										<span className="font-medium text-[0.8125rem]">
											{rowLabel(row)} ({list.length})
										</span>
									</span>
								</AccordionTrigger>
								<AccordionContent className="p-0">
									{list.map((err) => {
										const key = `${row}-${String(err.fieldName || "").toLowerCase()}-${err.col}-${String(
											err.message || ""
										).slice(0, ERROR_MESSAGE_PREVIEW_LENGTH)}`;
										const field = String(err.fieldName || "").toLowerCase();
										const Icon = fieldIcon[field] || CircleDashedIcon;
										return (
											<Collapsible
												className="border-t py-2 ps-6 pe-3"
												defaultOpen={false}
												key={key}
											>
												<CollapsibleTrigger className="flex w-full gap-2 font-semibold text-[0.8125rem] leading-6 [&[data-state=open]>svg]:rotate-180">
													<ChevronDownIcon
														aria-hidden={true}
														className="mt-0.5 shrink-0 opacity-60 transition-transform duration-200"
														size={16}
													/>
													<span className="flex items-center gap-2">
														<Icon
															aria-hidden={true}
															className="shrink-0 opacity-70"
															size={16}
														/>
														<span className="truncate">
															{formatFieldLabel(err.fieldName, isLocalized)}
														</span>
													</span>
												</CollapsibleTrigger>
												<CollapsibleContent className="mt-1 overflow-hidden ps-6 text-[0.75rem] text-muted-foreground data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
													<p className="mb-1 leading-5">{err.message}</p>
													{getViolatedRuleHints(err).length > 0 && (
														<ul className="ms-4 list-disc">
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
