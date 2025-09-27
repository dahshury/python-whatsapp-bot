"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { useUiCompositeOverride } from "@/lib/ui-registry";

function getOverride<TProps>(
	ov: Record<string, unknown>,
	key: string,
): React.ComponentType<TProps> | undefined {
	return ov[key] as unknown as React.ComponentType<TProps> | undefined;
}

function Collapsible(
	props: React.ComponentProps<typeof CollapsiblePrimitive.Root>,
) {
	const OV = useUiCompositeOverride("Collapsible");
	const Override = getOverride<
		React.ComponentProps<typeof CollapsiblePrimitive.Root>
	>(OV, "Collapsible");
	if (Override) return <Override {...props} />;
	return <CollapsiblePrimitive.Root {...props} />;
}

function CollapsibleTrigger(
	props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>,
) {
	const OV = useUiCompositeOverride("Collapsible");
	const Override = getOverride<
		React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>
	>(OV, "CollapsibleTrigger");
	if (Override) return <Override {...props} />;
	return <CollapsiblePrimitive.CollapsibleTrigger {...props} />;
}

function CollapsibleContent(
	props: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>,
) {
	const OV = useUiCompositeOverride("Collapsible");
	const Override = getOverride<
		React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>
	>(OV, "CollapsibleContent");
	if (Override) return <Override {...props} />;
	return <CollapsiblePrimitive.CollapsibleContent {...props} />;
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
