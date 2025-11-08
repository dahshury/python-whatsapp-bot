import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/shared/libs/utils";

const widgetVariants = cva(
  "relative flex flex-col whitespace-nowrap rounded-3xl border-2 shadow-md dark:shadow-secondary/50",
  {
    variants: {
      size: {
        sm: "size-48",
        md: "h-48 w-96",
        lg: "size-96",
      },
      design: {
        default: "p-6",
        mumbai: "p-4",
      },
      variant: {
        default: "bg-background text-foreground",
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      size: "sm",
      design: "default",
      variant: "default",
    },
  }
);

export interface WidgetProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof widgetVariants> {
  asChild?: boolean;
}

const Widget = forwardRef<HTMLDivElement, WidgetProps>(
  ({ className, size, design, variant, ...props }, ref) => (
    <div
      className={cn(widgetVariants({ size, design, variant, className }))}
      ref={ref}
      {...props}
    />
  )
);
Widget.displayName = "Widget";

const WidgetHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn(
        "flex flex-none items-start justify-between text-semibold",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
WidgetHeader.displayName = "WidgetHeader";

const WidgetTitle = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    className={cn("font-semibold leading-none tracking-tight", className)}
    ref={ref}
    {...props}
  />
));
WidgetTitle.displayName = "WidgetTitle";

const WidgetContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("flex flex-1 items-center justify-center", className)}
    ref={ref}
    {...props}
  />
));
WidgetContent.displayName = "WidgetContent";

const WidgetFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      className={cn("flex flex-none items-center justify-between", className)}
      ref={ref}
      {...props}
    />
  )
);
WidgetFooter.displayName = "WidgetFooter";

export {
  Widget,
  WidgetHeader,
  WidgetTitle,
  WidgetContent,
  WidgetFooter,
  widgetVariants,
};
