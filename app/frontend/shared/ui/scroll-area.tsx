"use client";

import {
	Corner as ScrollAreaCorner,
	Root as ScrollAreaRoot,
	Scrollbar as ScrollAreaScrollbar,
	Thumb as ScrollAreaThumb,
	Viewport as ScrollAreaViewport,
} from "@radix-ui/react-scroll-area";
import { useTouchPrimary } from "@shared/libs/hooks/use-has-primary-touch";
import { cn } from "@shared/libs/utils";
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	type CSSProperties,
	createContext,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

const ScrollAreaContext = createContext<boolean>(false);
type Mask = {
	top: boolean;
	bottom: boolean;
	left: boolean;
	right: boolean;
};

const ScrollArea = ({
	className,
	children,
	scrollHideDelay = 0,
	viewportClassName,
	maskClassName,
	maskHeight = 30,
	ref,
	...props
}: ComponentPropsWithoutRef<typeof ScrollAreaRoot> & {
	viewportClassName?: string;
	/**
	 * `maskHeight` is the height of the mask in pixels.
	 * pass `0` to disable the mask
	 * @default 30
	 */
	maskHeight?: number;
	maskClassName?: string;
} & {
	ref?: RefObject<ComponentRef<typeof ScrollAreaRoot> | null>;
}) => {
	const [showMask, setShowMask] = useState<Mask>({
		top: false,
		bottom: false,
		left: false,
		right: false,
	});
	const viewportRef = useRef<HTMLDivElement>(null);
	const isTouch = useTouchPrimary();

	const checkScrollability = useCallback(() => {
		const element = viewportRef.current;
		if (!element) {
			return;
		}

		const {
			scrollTop,
			scrollLeft,
			scrollWidth,
			clientWidth,
			scrollHeight,
			clientHeight,
		} = element;
		setShowMask((prev) => ({
			...prev,
			top: scrollTop > 0,
			bottom: scrollTop + clientHeight < scrollHeight - 1,
			left: scrollLeft > 0,
			right: scrollLeft + clientWidth < scrollWidth - 1,
		}));
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") {
			return;
		}

		const element = viewportRef.current;
		if (!element) {
			return;
		}

		const controller = new AbortController();
		const { signal } = controller;

		const resizeObserver = new ResizeObserver(checkScrollability);
		resizeObserver.observe(element);

		element.addEventListener("scroll", checkScrollability, { signal });
		window.addEventListener("resize", checkScrollability, { signal });

		// Run an initial check whenever dependencies change (including pointer mode)
		checkScrollability();

		return () => {
			controller.abort();
			resizeObserver.disconnect();
		};
	}, [checkScrollability]);

	return (
		<ScrollAreaContext.Provider value={isTouch}>
			{isTouch ? (
				<div
					className={cn("relative overflow-hidden", className)}
					data-slot="scroll-area"
					ref={ref}
					{...props}
				>
					<div
						className={cn(
							"size-full overflow-auto rounded-[inherit]",
							viewportClassName
						)}
						data-slot="scroll-area-viewport"
						ref={viewportRef}
					>
						{children}
					</div>

					{maskHeight > 0 && (
						<ScrollMask
							className={maskClassName}
							maskHeight={maskHeight}
							showMask={showMask}
						/>
					)}
				</div>
			) : (
				<ScrollAreaRoot
					className={cn("relative overflow-hidden", className)}
					data-slot="scroll-area"
					ref={ref}
					scrollHideDelay={scrollHideDelay}
					{...props}
				>
					<ScrollAreaViewport
						className={cn("size-full rounded-[inherit]", viewportClassName)}
						data-slot="scroll-area-viewport"
						ref={viewportRef}
					>
						{children}
					</ScrollAreaViewport>

					{maskHeight > 0 && (
						<ScrollMask
							className={maskClassName}
							maskHeight={maskHeight}
							showMask={showMask}
						/>
					)}
					<ScrollBar />
					<ScrollAreaCorner />
				</ScrollAreaRoot>
			)}
		</ScrollAreaContext.Provider>
	);
};

ScrollArea.displayName = ScrollAreaRoot.displayName;

const ScrollBar = ({
	className,
	orientation = "vertical",
	ref,
	...props
}: ComponentPropsWithoutRef<typeof ScrollAreaScrollbar> & {
	ref?: RefObject<ComponentRef<typeof ScrollAreaScrollbar> | null>;
}) => {
	const isTouch = useContext(ScrollAreaContext);

	if (isTouch) {
		return null;
	}

	return (
		<ScrollAreaScrollbar
			className={cn(
				"data-[state=visible]:fade-in-0 data-[state=hidden]:fade-out-0 flex touch-none select-none p-px transition-[colors] duration-150 hover:bg-muted data-[state=hidden]:animate-out data-[state=visible]:animate-in dark:hover:bg-muted/50",
				orientation === "vertical" &&
					"h-full w-2.5 border-l border-l-transparent",
				orientation === "horizontal" &&
					"h-2.5 flex-col border-t border-t-transparent px-1 pr-1.25",
				className
			)}
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			ref={ref}
			{...props}
		>
			<ScrollAreaThumb
				className={cn(
					"relative flex-1 origin-center rounded-full bg-border transition-[scale]",
					orientation === "vertical" && "my-1 active:scale-y-95",
					orientation === "horizontal" && "active:scale-x-98"
				)}
				data-slot="scroll-area-thumb"
			/>
		</ScrollAreaScrollbar>
	);
};

ScrollBar.displayName = ScrollAreaScrollbar.displayName;

const ScrollMask = ({
	showMask,
	maskHeight,
	className,
	...props
}: ComponentPropsWithoutRef<"div"> & {
	showMask: Mask;
	maskHeight: number;
}) => (
	<>
		<div
			{...props}
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 z-10",
				"before:absolute before:inset-x-0 before:top-0 before:transition-[height,opacity] before:duration-300 before:content-['']",
				"after:absolute after:inset-x-0 after:bottom-0 after:transition-[height,opacity] after:duration-300 after:content-['']",
				"before:h-(--top-fade-height) after:h-(--bottom-fade-height)",
				showMask.top ? "before:opacity-100" : "before:opacity-0",
				showMask.bottom ? "after:opacity-100" : "after:opacity-0",
				"before:bg-gradient-to-b before:from-background before:to-transparent",
				"after:bg-gradient-to-t after:from-background after:to-transparent",
				className
			)}
			style={
				{
					"--top-fade-height": showMask.top ? `${maskHeight}px` : "0px",
					"--bottom-fade-height": showMask.bottom ? `${maskHeight}px` : "0px",
				} as CSSProperties
			}
		/>
		<div
			{...props}
			aria-hidden="true"
			className={cn(
				"pointer-events-none absolute inset-0 z-10",
				"before:absolute before:inset-y-0 before:left-0 before:transition-[width,opacity] before:duration-300 before:content-['']",
				"after:absolute after:inset-y-0 after:right-0 after:transition-[width,opacity] after:duration-300 after:content-['']",
				"before:w-(--left-fade-width) after:w-(--right-fade-width)",
				showMask.left ? "before:opacity-100" : "before:opacity-0",
				showMask.right ? "after:opacity-100" : "after:opacity-0",
				"before:bg-gradient-to-r before:from-background before:to-transparent",
				"after:bg-gradient-to-l after:from-background after:to-transparent",
				className
			)}
			style={
				{
					"--left-fade-width": showMask.left ? `${maskHeight}px` : "0px",
					"--right-fade-width": showMask.right ? `${maskHeight}px` : "0px",
				} as CSSProperties
			}
		/>
	</>
);

export { ScrollArea, ScrollBar };
