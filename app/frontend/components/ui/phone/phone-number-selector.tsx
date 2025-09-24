import { CheckCircle2, Plus } from "lucide-react";
import type React from "react";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Flag as FlagComponent } from "@/components/ui/flag";
import { i18n } from "@/lib/i18n";
import type { IndexedPhoneOption } from "@/lib/services/phone/phone-index.service";

// Using shared Flag component

interface PhoneNumberSelectorBaseProps {
	search: string;
	setSearch: (s: string) => void;
	visiblePhones: IndexedPhoneOption[];
	selectedPhone: string;
	onSelect: (phoneNumber: string) => void;
	canCreateNew: boolean;
	onCreateNew: (raw: string) => void;
	addPreviewDisplay: string;
	isLocalized: boolean;
	selectedRef?: React.RefObject<HTMLDivElement | null>;
	allowCreateNew?: boolean;
}
export const PhoneNumberSelectorContent: React.FC<
	PhoneNumberSelectorBaseProps
> = ({
	search,
	setSearch,
	visiblePhones,
	selectedPhone,
	onSelect,
	canCreateNew,
	onCreateNew,
	addPreviewDisplay,
	isLocalized,
	selectedRef,
	allowCreateNew,
}) => {
	return (
		<Command shouldFilter={false}>
			<CommandInput
				value={search}
				onValueChange={setSearch}
				placeholder={i18n.getMessage("phone_search_placeholder", isLocalized)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						// Create-new when allowed and meaningful
						if (canCreateNew) {
							e.preventDefault();
							e.stopPropagation();
							onCreateNew(search);
							return;
						}

						// Fallback: no matches but input exists and allowCreateNew is enabled
						if (search.trim() && visiblePhones.length === 0 && allowCreateNew) {
							e.preventDefault();
							e.stopPropagation();
							onCreateNew(search);
							return;
						}

						// Otherwise select the currently highlighted item
						try {
							const root = (e.currentTarget.closest("[cmdk-root]") ||
								e.currentTarget.parentElement) as HTMLElement | null;
							const active = root?.querySelector(
								"[cmdk-item][data-selected='true']",
							) as HTMLElement | null;
							const selectedNumber = active?.getAttribute("data-option-number");
							if (selectedNumber) {
								e.preventDefault();
								e.stopPropagation();
								onSelect(selectedNumber);
								return;
							}
						} catch {}
					}
				}}
			/>
			<CommandList>
				<ThemedScrollbar className="h-72">
					{canCreateNew && (
						<div className="p-2">
							<CommandItem
								value="create-new"
								onSelect={() => onCreateNew(search)}
								className="gap-2 text-blue-600 hover:text-blue-700"
							>
								<Plus className="size-4" />
								<span>
									{i18n
										.getMessage("phone_add_number_label", isLocalized)
										.replace("{value}", addPreviewDisplay)}
								</span>
							</CommandItem>
						</div>
					)}
					<CommandEmpty>
						{i18n.getMessage("phone_no_phone_found", isLocalized)}
					</CommandEmpty>
					<CommandGroup>
						{visiblePhones.map((option) => (
							<CommandItem
								key={option.number}
								value={option.number}
								onSelect={() => onSelect(option.number)}
								className="gap-3 py-2.5 px-3"
								ref={
									selectedPhone === option.number
										? (selectedRef as React.RefObject<HTMLDivElement | null>)
										: undefined
								}
								data-option-number={option.number}
							>
								<div className="flex flex-col space-y-2 min-w-0 flex-1">
									<span className="text-sm font-medium text-foreground truncate leading-tight">
										{option.name || option.displayNumber || option.number}
									</span>
									<div className="flex items-center gap-1.5">
										<FlagComponent
											country={option.__country as unknown as string}
											className="opacity-60 scale-75"
										/>
										<span className="text-sm text-muted-foreground leading-tight truncate">
											{option.displayNumber || option.number}
										</span>
									</div>
								</div>
								{selectedPhone === option.number && (
									<CheckCircle2 className="ms-auto size-4 text-primary" />
								)}
							</CommandItem>
						))}
					</CommandGroup>
				</ThemedScrollbar>
			</CommandList>
		</Command>
	);
};
