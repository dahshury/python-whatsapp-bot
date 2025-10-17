"use client";

import { cn } from "@shared/libs/utils";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { useContext, useId, useLayoutEffect, useMemo } from "react";
import type { LegendProps } from "recharts";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";

// Regex patterns at top level for performance
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{3,8}$/;
const FUNCTIONAL_COLOR_REGEX = /^(?:rgb|rgba|hsl|hsla)\([^)]*\)$/;
const NAMED_COLOR_REGEX = /^[a-zA-Z]+$/;

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

// Validate that a string is a safe CSS color value
function isValidCssColor(color: string): boolean {
	// Allow hex colors, rgb/rgba, hsl/hsla, named colors, and any usage of CSS variables
	// Note: We intentionally allow nested functions like hsl(var(--chart-1))
	return (
		HEX_COLOR_REGEX.test(color) || // hex
		FUNCTIONAL_COLOR_REGEX.test(color) || // functional color notations
		NAMED_COLOR_REGEX.test(color) || // named colors
		color.includes("var(") // CSS custom properties anywhere in the string (e.g., hsl(var(--x)))
	);
}

export type ChartConfig = {
	[k in string]: {
		label?: ReactNode;
		icon?: React.ComponentType;
	} & (
		| { color?: string; theme?: never }
		| { color?: never; theme: Record<keyof typeof THEMES, string> }
	);
};

type ChartContextProps = {
	config: ChartConfig;
};

import { createContext } from "react";

const ChartContext = createContext<ChartContextProps | null>(null);

function useChart() {
	const context = useContext(ChartContext);

	if (!context) {
		throw new Error("useChart must be used within a <ChartContainer />");
	}

	return context;
}

const ChartContainer = ({
	id,
	className,
	children,
	config,
	ref,
	...props
}: ComponentProps<"div"> & {
	config: ChartConfig;
	children: ComponentProps<typeof ResponsiveContainer>["children"];
} & { ref?: React.RefObject<HTMLDivElement | null> }) => {
	const uniqueId = useId();
	const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

	return (
		<ChartContext.Provider value={{ config }}>
			<div
				className={cn(
					"flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
					className
				)}
				data-chart={chartId}
				ref={ref}
				{...props}
			>
				<ChartStyle config={config} id={chartId} />
				<ResponsiveContainer>{children}</ResponsiveContainer>
			</div>
		</ChartContext.Provider>
	);
};
ChartContainer.displayName = "Chart";

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
	const colorConfig = Object.entries(config).filter(
		([, itemConfig]) => itemConfig.theme || itemConfig.color
	);

	// Generate safe CSS content
	const cssContent = colorConfig.length
		? Object.entries(THEMES)
				.map(([theme, prefix]) => {
					const rules = colorConfig
						.map(([key, itemConfig]) => {
							const color =
								itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ||
								itemConfig.color;
							return color && isValidCssColor(color)
								? `  --color-${key}: ${color};`
								: null;
						})
						.filter(Boolean)
						.join("\n");

					return rules ? `${prefix} [data-chart=${id}] {\n${rules}\n}` : "";
				})
				.filter(Boolean)
				.join("\n")
		: "";

	// Use a style element with a data attribute instead of dangerouslySetInnerHTML
	useLayoutEffect(() => {
		if (!cssContent) {
			return;
		}

		const styleId = `chart-style-${id}`;
		let styleElement = document.getElementById(styleId) as HTMLStyleElement;

		if (!styleElement) {
			styleElement = document.createElement("style");
			styleElement.id = styleId;
			document.head.appendChild(styleElement);
		}

		styleElement.textContent = cssContent;

		return () => {
			if (styleElement?.parentNode) {
				styleElement.parentNode.removeChild(styleElement);
			}
		};
	}, [id, cssContent]);

	return null;
};

const ChartTooltip = Tooltip;

// Extract payload item rendering logic to reduce complexity
function renderPayloadItem(options: {
	item: {
		value?: unknown;
		name?: unknown;
		dataKey?: string | number;
		payload?: Record<string, unknown>;
		color?: string;
		fill?: string | undefined;
	};
	itemConfig?: ChartConfig[string];
	indicator: "line" | "dot" | "dashed";
	color?: string;
	hideIndicator: boolean;
	formatter?: (
		value: unknown,
		name: unknown,
		itemData: unknown,
		_index: unknown,
		payload: unknown
	) => React.ReactNode;
}) {
	const { item, itemConfig, indicator, color, hideIndicator, formatter } =
		options;
	const indicatorColor = color || item.payload?.fill || item.color;

	if (formatter && item?.value !== undefined && item.name) {
		return formatter(item.value, item.name, item, 0, item.payload);
	}

	return (
		<>
			{itemConfig?.icon ? (
				<itemConfig.icon />
			) : (
				!hideIndicator && (
					<div
						className={cn(
							"shrink-0 rounded-[0.125rem] border-[--color-border] bg-[--color-bg]",
							{
								"h-2.5 w-2.5": indicator === "dot",
								"w-1": indicator === "line",
								"w-0 border-[0.09375rem] border-dashed bg-transparent":
									indicator === "dashed",
							}
						)}
						style={
							{
								"--color-bg": indicatorColor,
								"--color-border": indicatorColor,
							} as CSSProperties
						}
					/>
				)
			)}
			<div
				className={cn(
					"flex flex-1 justify-between leading-none",
					"items-center"
				)}
			>
				<span className="text-muted-foreground">
					{itemConfig?.label ||
						(typeof item.name === "string"
							? item.name
							: String(item.name || ""))}
				</span>
			</div>
		</>
	);
}

const ChartTooltipContent = ({
	active,
	payload: payloadData,
	className,
	indicator = "dot",
	hideLabel = false,
	hideIndicator = false,
	label,
	labelFormatter,
	labelClassName,
	formatter: rawFormatter,
	color,
	nameKey,
	labelKey,
	ref,
}: ComponentProps<typeof Tooltip> &
	ComponentProps<"div"> & {
		hideLabel?: boolean;
		hideIndicator?: boolean;
		indicator?: "line" | "dot" | "dashed";
		nameKey?: string;
		labelKey?: string;
	} & { ref?: React.RefObject<HTMLDivElement | null> }) => {
	const { config } = useChart();

	// Normalize formatter to our internal signature
	const formatter = rawFormatter as
		| ((
				value: unknown,
				name: unknown,
				itemData: unknown,
				_index: unknown,
				payload: unknown
		  ) => React.ReactNode)
		| undefined;

	const tooltipLabel = useMemo(() => {
		if (hideLabel || !payloadData?.length) {
			return null;
		}

		const [item] = payloadData;
		const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
		const itemConfig = getPayloadConfigFromPayload(config, item, key);
		const value =
			!labelKey && typeof label === "string"
				? config[label as keyof typeof config]?.label || label
				: itemConfig?.label;

		if (labelFormatter) {
			return (
				<div className={cn("font-medium", labelClassName)}>
					{labelFormatter(value, payloadData)}
				</div>
			);
		}

		if (!value) {
			return null;
		}

		return <div className={cn("font-medium", labelClassName)}>{value}</div>;
	}, [
		label,
		labelFormatter,
		payloadData,
		hideLabel,
		labelClassName,
		config,
		labelKey,
	]);

	if (!(active && payloadData?.length)) {
		return null;
	}

	const nestLabel = payloadData.length === 1 && indicator !== "dot";

	return (
		<div
			className={cn(
				"grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
				className
			)}
			ref={ref}
		>
			{nestLabel ? null : tooltipLabel}
			<div className="grid gap-1.5">
				{payloadData.map((item) => {
					const key = `${nameKey || item.name || item.dataKey || "value"}`;
					const itemConfig = getPayloadConfigFromPayload(config, item, key);

					return (
						<div
							className={cn(
								"flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
								indicator === "dot" && "items-center"
							)}
							key={item.dataKey}
						>
							{renderPayloadItem({
								item,
								...(itemConfig !== undefined && { itemConfig }),
								indicator,
								...(color !== undefined && { color }),
								hideIndicator,
								...(formatter !== undefined && { formatter }),
							})}
							<div
								className={cn(
									"flex flex-1 justify-between leading-none",
									nestLabel ? "items-end" : "items-center"
								)}
							>
								<div className="grid gap-1.5">
									{nestLabel ? tooltipLabel : null}
									<span className="text-muted-foreground">
										{itemConfig?.label || item.name}
									</span>
								</div>
								{item.value && (
									<span className="font-medium font-mono text-foreground tabular-nums">
										{item.value.toLocaleString()}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
ChartTooltipContent.displayName = "ChartTooltip";

const ChartLegend = Legend;

const ChartLegendContent = ({
	className,
	hideIcon = false,
	payload,
	verticalAlign = "bottom",
	nameKey,
	ref,
}: ComponentProps<"div"> &
	Pick<LegendProps, "payload" | "verticalAlign"> & {
		hideIcon?: boolean;
		nameKey?: string;
	} & { ref?: React.RefObject<HTMLDivElement | null> }) => {
	const { config } = useChart();

	if (!payload?.length) {
		return null;
	}

	return (
		<div
			className={cn(
				"flex items-center justify-center gap-4",
				verticalAlign === "top" ? "pb-3" : "pt-3",
				className
			)}
			ref={ref}
		>
			{payload.map((item) => {
				const key = `${nameKey || item.dataKey || "value"}`;
				const itemConfig = getPayloadConfigFromPayload(config, item, key);

				return (
					<div
						className={cn(
							"flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
						)}
						key={item.value}
					>
						{itemConfig?.icon && !hideIcon ? (
							<itemConfig.icon />
						) : (
							<div
								className="h-2 w-2 shrink-0 rounded-[0.125rem]"
								style={{
									backgroundColor: item.color,
								}}
							/>
						)}
						{itemConfig?.label}
					</div>
				);
			})}
		</div>
	);
};
ChartLegendContent.displayName = "ChartLegend";

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
	config: ChartConfig,
	payload: unknown,
	key: string
) {
	if (typeof payload !== "object" || payload === null) {
		return;
	}

	const payloadPayload =
		"payload" in payload &&
		typeof payload.payload === "object" &&
		payload.payload !== null
			? payload.payload
			: undefined;

	let configLabelKey: string = key;

	if (
		key in payload &&
		typeof payload[key as keyof typeof payload] === "string"
	) {
		configLabelKey = payload[key as keyof typeof payload] as string;
	} else if (
		payloadPayload &&
		key in payloadPayload &&
		typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
	) {
		configLabelKey = payloadPayload[
			key as keyof typeof payloadPayload
		] as string;
	}

	return configLabelKey in config
		? config[configLabelKey]
		: config[key as keyof typeof config];
}

export {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartStyle,
	ChartTooltip,
	ChartTooltipContent,
};
