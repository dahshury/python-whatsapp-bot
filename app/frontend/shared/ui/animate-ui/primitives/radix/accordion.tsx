"use client";

import { useControlledState } from "@shared/libs/hooks/use-controlled-state";
import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { type ComponentProps, useEffect, useState } from "react";
import { getStrictContext } from "@/shared/libs/get-strict-context";

type AccordionContextType = {
	value: string | string[] | undefined;
	setValue: (value: string | string[] | undefined) => void;
};

type AccordionItemContextType = {
	value: string;
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
};

const [AccordionProvider, useAccordion] =
	getStrictContext<AccordionContextType>("AccordionContext");

const [AccordionItemProvider, useAccordionItem] =
	getStrictContext<AccordionItemContextType>("AccordionItemContext");

type AccordionProps = ComponentProps<typeof AccordionPrimitive.Root>;

function Accordion(props: AccordionProps) {
	const [value, setValue] = useControlledState<string | string[] | undefined>({
		value: props?.value,
		defaultValue: props?.defaultValue,
		onChange: props?.onValueChange as (
			changedValue: string | string[] | undefined
		) => void,
	});

	return (
		<AccordionProvider value={{ value, setValue }}>
			<AccordionPrimitive.Root
				data-slot="accordion"
				{...props}
				onValueChange={setValue}
			/>
		</AccordionProvider>
	);
}

type AccordionItemProps = ComponentProps<typeof AccordionPrimitive.Item>;

function AccordionItem(props: AccordionItemProps) {
	const { value } = useAccordion();
	const [isOpen, setIsOpen] = useState(value?.includes(props?.value) ?? false);

	useEffect(() => {
		setIsOpen(value?.includes(props?.value) ?? false);
	}, [value, props?.value]);

	return (
		<AccordionItemProvider value={{ isOpen, setIsOpen, value: props.value }}>
			<AccordionPrimitive.Item data-slot="accordion-item" {...props} />
		</AccordionItemProvider>
	);
}

type AccordionHeaderProps = ComponentProps<typeof AccordionPrimitive.Header>;

function AccordionHeader(props: AccordionHeaderProps) {
	return <AccordionPrimitive.Header data-slot="accordion-header" {...props} />;
}

type AccordionTriggerProps = ComponentProps<typeof AccordionPrimitive.Trigger>;

function AccordionTrigger(props: AccordionTriggerProps) {
	return (
		<AccordionPrimitive.Trigger data-slot="accordion-trigger" {...props} />
	);
}

type AccordionContentProps = Omit<
	ComponentProps<typeof AccordionPrimitive.Content>,
	"asChild" | "forceMount"
> &
	HTMLMotionProps<"div"> & {
		keepRendered?: boolean;
	};

function AccordionContent({
	keepRendered = false,
	transition = { type: "spring", stiffness: 150, damping: 22 },
	...props
}: AccordionContentProps) {
	const { isOpen } = useAccordionItem();

	return (
		<AnimatePresence>
			{keepRendered ? (
				<AccordionPrimitive.Content asChild forceMount>
					<motion.div
						animate={
							isOpen
								? { height: "auto", opacity: 1, "--mask-stop": "100%" }
								: { height: 0, opacity: 0, "--mask-stop": "0%" }
						}
						data-slot="accordion-content"
						initial={{ height: 0, opacity: 0, "--mask-stop": "0%" }}
						key="accordion-content"
						style={{
							maskImage:
								"linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
							WebkitMaskImage:
								"linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
							overflow: "hidden",
						}}
						transition={transition}
						{...props}
					/>
				</AccordionPrimitive.Content>
			) : (
				isOpen && (
					<AccordionPrimitive.Content asChild forceMount>
						<motion.div
							animate={{ height: "auto", opacity: 1, "--mask-stop": "100%" }}
							data-slot="accordion-content"
							exit={{ height: 0, opacity: 0, "--mask-stop": "0%" }}
							initial={{ height: 0, opacity: 0, "--mask-stop": "0%" }}
							key="accordion-content"
							style={{
								maskImage:
									"linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
								WebkitMaskImage:
									"linear-gradient(black var(--mask-stop), transparent var(--mask-stop))",
								overflow: "hidden",
							}}
							transition={transition}
							{...props}
						/>
					</AccordionPrimitive.Content>
				)
			)}
		</AnimatePresence>
	);
}

export {
	Accordion,
	AccordionContent,
	type AccordionContentProps,
	type AccordionContextType,
	AccordionHeader,
	type AccordionHeaderProps,
	AccordionItem,
	type AccordionItemContextType,
	type AccordionItemProps,
	type AccordionProps,
	AccordionTrigger,
	type AccordionTriggerProps,
	useAccordion,
	useAccordionItem,
};
