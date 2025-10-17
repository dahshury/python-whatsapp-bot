import { i18n } from "@shared/libs/i18n";
import { getLocalizedCountryOptions } from "@shared/libs/phone/countries";
import { useLanguage } from "@shared/libs/state/language-context";
import { getSizeClasses } from "@shared/libs/ui/size";
import { cn } from "@shared/libs/utils";
import { Button } from "@ui/button";
import { CheckCircle2, ChevronsUpDown } from "lucide-react";
import { type FC, type RefObject, useMemo } from "react";
import type * as RPNInput from "react-phone-number-input";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/shared/ui/command";
import { Flag as FlagComponent } from "@/shared/ui/flag";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { ThemedScrollbar } from "@/shared/ui/themed-scrollbar";

type CountrySelectorProps = {
	country: RPNInput.Country | undefined;
	setCountry: (c: RPNInput.Country) => void;
	search: string;
	setSearch: (s: string) => void;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	selectedRef?: RefObject<HTMLDivElement | null>;
	disabled?: boolean;
	size?: "sm" | "default" | "lg";
	className?: string;
};

export const PhoneCountrySelector: FC<CountrySelectorProps> = ({
	country,
	setCountry,
	search,
	setSearch,
	isOpen,
	setIsOpen,
	selectedRef,
	disabled,
	size = "default",
	className,
}) => {
	const { isLocalized } = useLanguage();
	const countryOptions = useMemo(
		() => getLocalizedCountryOptions(isLocalized),
		[isLocalized]
	);

	return (
		<Popover modal={false} onOpenChange={setIsOpen} open={isOpen}>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						"flex gap-1 rounded-s-lg rounded-e-none border-r-0 focus:z-10",
						getSizeClasses(size),
						className
					)}
					dir="ltr"
					disabled={disabled}
					type="button"
					variant="outline"
				>
					{country ? (
						<FlagComponent country={country} title={country} />
					) : (
						<span className="text-muted-foreground">🌍</span>
					)}
					<ChevronsUpDown className="-mr-2 size-4 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className={cn("w-[18.75rem] p-0", "click-outside-ignore")}
				dir="ltr"
			>
				<Command dir="ltr" shouldFilter={false}>
					<CommandInput
						dir="ltr"
						onValueChange={setSearch}
						placeholder={i18n.getMessage(
							"phone_country_search_placeholder",
							isLocalized
						)}
						value={search}
					/>
					<CommandList dir="ltr">
						<ThemedScrollbar className="h-72" rtl={false}>
							<CommandEmpty>
								{i18n.getMessage("phone_no_country_found", isLocalized)}
							</CommandEmpty>
							<CommandGroup dir="ltr">
								{countryOptions
									.filter((option) =>
										option.label.toLowerCase().includes(search.toLowerCase())
									)
									.map((option) => {
										const isSelected = country === option.value;
										return (
											<CommandItem
												className="gap-2"
												data-option-country={option.value}
												key={option.value}
												onSelect={() => setCountry(option.value)}
												{...(isSelected && selectedRef && { ref: selectedRef })}
												value={option.value}
											>
												<FlagComponent
													country={option.value}
													title={option.label}
												/>
												<span className="flex-1 text-sm">{option.label}</span>
												{country === option.value && (
													<CheckCircle2 className="ms-auto size-4 text-primary" />
												)}
											</CommandItem>
										);
									})}
							</CommandGroup>
						</ThemedScrollbar>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
