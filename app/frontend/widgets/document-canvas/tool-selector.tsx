import { RadioCardGroup } from "@/shared/ui/choice-cards/radio-card-group";
import { CANVAS_TOOL_ITEMS as items } from "./tool-options";

export default function ToolSelector() {
	return (
		<RadioCardGroup className="grid-cols-2" defaultValue="1" items={items} />
	);
}
