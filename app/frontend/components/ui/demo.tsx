import { UserDropdown } from "@/components/ui/user-dropdown";

export default function DemoOne() {
	return <UserDropdown />;
}

import {
	Bell,
	FileText,
	HelpCircle,
	Home,
	Lock,
	Mail,
	Settings,
	Shield,
	User,
} from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";
import { HeroPill, StarIcon } from "@/components/ui/hero-pill";

function HeroPillDemo() {
	return (
		<div className="space-y-4">
			<HeroPill icon={<StarIcon />} text="New releases every week" />

			<HeroPill
				icon={
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						className="fill-zinc-500"
					>
						<title>Triangle icon</title>
						<path d="M12 2L1 21h22L12 2z" />
					</svg>
				}
				text="Custom Icon Pill"
			/>
		</div>
	);
}

export { HeroPillDemo };

function DefaultDemo() {
	const tabs = [
		{ title: "Dashboard", icon: Home },
		{ title: "Notifications", icon: Bell },
		{ type: "separator" as const },
		{ title: "Settings", icon: Settings },
		{ title: "Support", icon: HelpCircle },
		{ title: "Security", icon: Shield },
	];

	return (
		<div className="flex flex-col gap-4">
			<ExpandableTabs tabs={tabs} />
		</div>
	);
}

function CustomColorDemo() {
	const tabs = [
		{ title: "Profile", icon: User },
		{ title: "Messages", icon: Mail },
		{ type: "separator" as const },
		{ title: "Documents", icon: FileText },
		{ title: "Privacy", icon: Lock },
	];

	return (
		<div className="flex flex-col gap-4">
			<ExpandableTabs
				tabs={tabs}
				activeColor="text-blue-500"
				className="border-blue-200 dark:border-blue-800"
			/>
		</div>
	);
}

export { DefaultDemo, CustomColorDemo };
