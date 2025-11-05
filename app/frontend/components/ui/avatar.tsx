"use client";

import {
  Fallback as AvatarFallbackPrimitive,
  Image as AvatarImagePrimitive,
  Root as AvatarRootPrimitive,
} from "@radix-ui/react-avatar";
import {
  type ComponentPropsWithoutRef,
  type ComponentRef,
  forwardRef,
} from "react";

import { cn } from "@/lib/utils";

const Avatar = forwardRef<
  ComponentRef<typeof AvatarRootPrimitive>,
  ComponentPropsWithoutRef<typeof AvatarRootPrimitive>
>(({ className, ...props }, ref) => (
  <AvatarRootPrimitive
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    ref={ref}
    {...props}
  />
));

Avatar.displayName = AvatarRootPrimitive.displayName;

const AvatarImage = forwardRef<
  ComponentRef<typeof AvatarImagePrimitive>,
  ComponentPropsWithoutRef<typeof AvatarImagePrimitive>
>(({ className, ...props }, ref) => (
  <AvatarImagePrimitive
    className={cn("aspect-square h-full w-full", className)}
    ref={ref}
    {...props}
  />
));

AvatarImage.displayName = AvatarImagePrimitive.displayName;

const AvatarFallback = forwardRef<
  ComponentRef<typeof AvatarFallbackPrimitive>,
  ComponentPropsWithoutRef<typeof AvatarFallbackPrimitive>
>(({ className, ...props }, ref) => (
  <AvatarFallbackPrimitive
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    ref={ref}
    {...props}
  />
));

AvatarFallback.displayName = AvatarFallbackPrimitive.displayName;

export { Avatar, AvatarImage, AvatarFallback };
