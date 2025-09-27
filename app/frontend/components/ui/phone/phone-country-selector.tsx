import { CheckCircle2, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import type * as RPNInput from "react-phone-number-input";
import { ThemedScrollbar } from "@/components/themed-scrollbar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Flag as FlagComponent } from "@/components/ui/flag";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { i18n } from "@/lib/i18n";
import { useLanguage } from "@/lib/language-context";
import { getLocalizedCountryOptions } from "@/lib/phone/countries";
import { getSizeClasses } from "@/lib/ui/size";
import { cn } from "@/lib/utils";

interface CountrySelectorProps {
	country: RPNInput.Country | undefined;
	setCountry: (c: RPNInput.Country) => void;
	search: string;
	setSearch: (s: string) => void;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	selectedRef?: React.RefObject<HTMLDivElement | null>;
	disabled?: boolean;
	size?: "sm" | "default" | "lg";
}

export const PhoneCountrySelector: React.FC<CountrySelectorProps> = ({
	country,
	setCountry,
	search,
	setSearch,
	isOpen,
	setIsOpen,
	selectedRef,
	disabled,
	size = "default",
}) => {
	const { isLocalized } = useLanguage();
	const countryOptions = React.useMemo(
		() => getLocalizedCountryOptions(isLocalized),
		[isLocalized],
	);

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					dir="ltr"
					type="button"
					variant="outline"
					disabled={disabled}
					className={cn(
						"flex gap-1 rounded-e-none rounded-s-lg border-r-0 focus:z-10",
						getSizeClasses(size),
					)}
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
				<Command shouldFilter={false} dir="ltr">
					<CommandInput
						value={search}
						onValueChange={setSearch}
						placeholder={i18n.getMessage(
							"phone_country_search_placeholder",
							isLocalized,
						)}
						dir="ltr"
					/>
					<CommandList dir="ltr">
						<ThemedScrollbar className="h-72" rtl={false}>
							<CommandEmpty>
								{i18n.getMessage("phone_no_country_found", isLocalized)}
							</CommandEmpty>
							<CommandGroup dir="ltr">
								{countryOptions
									.filter((option) =>
										option.label.toLowerCase().includes(search.toLowerCase()),
									)
									.map((option) => (
										<CommandItem
											key={option.value}
											value={option.value}
											onSelect={() => setCountry(option.value)}
											className="gap-2"
											ref={
												country === option.value
													? (selectedRef as React.RefObject<HTMLDivElement | null>)
													: undefined
											}
											data-option-country={option.value}
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
									))}
							</CommandGroup>
						</ThemedScrollbar>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};
