import { UserDropdown } from '@/shared/ui/user-dropdown'

export default function DemoOne() {
	return <UserDropdown />
}

import {
	Bell,
	HelpCircle,
	Home,
	Lock,
	Mail,
	Settings,
	Shield,
	User,
} from 'lucide-react'
import { ExpandableTabs } from '@/shared/ui/expandable-tabs'
import { HeroPill, StarIcon } from '@/shared/ui/hero-pill'

function HeroPillDemo() {
	return (
		<div className="space-y-4">
			<HeroPill icon={<StarIcon />} text="New releases every week" />

			<HeroPill
				icon={
					<svg
						className="fill-zinc-500"
						height="12"
						viewBox="0 0 24 24"
						width="12"
						xmlns="http://www.w3.org/2000/svg"
					>
						<title>Triangle icon</title>
						<path d="M12 2L1 21h22L12 2z" />
					</svg>
				}
				text="Custom Icon Pill"
			/>
		</div>
	)
}

export { HeroPillDemo }

function DefaultDemo() {
	const tabs = [
		{ title: 'Dashboard', icon: Home },
		{ title: 'Notifications', icon: Bell },
		{ type: 'separator' as const },
		{ title: 'Settings', icon: Settings },
		{ title: 'Support', icon: HelpCircle },
		{ title: 'Security', icon: Shield },
	]

	return (
		<div className="flex flex-col gap-4">
			<ExpandableTabs tabs={tabs} />
		</div>
	)
}

function CustomColorDemo() {
	const tabs = [
		{ title: 'Profile', icon: User },
		{ title: 'Messages', icon: Mail },
		{ type: 'separator' as const },
		{ title: 'Privacy', icon: Lock },
	]

	return (
		<div className="flex flex-col gap-4">
			<ExpandableTabs
				activeColor="text-blue-500"
				className="border-blue-200 dark:border-blue-800"
				tabs={tabs}
			/>
		</div>
	)
}

export { DefaultDemo, CustomColorDemo }
