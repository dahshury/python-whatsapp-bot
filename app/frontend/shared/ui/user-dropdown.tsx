import { Icon } from '@iconify/react'
import { cn } from '@shared/libs/utils'
import { Badge } from '@ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

const MENU_ITEMS = {
	status: [
		{
			value: 'focus',
			icon: 'solar:emoji-funny-circle-line-duotone',
			label: 'Focus',
		},
		{
			value: 'offline',
			icon: 'solar:moon-sleep-line-duotone',
			label: 'Appear Offline',
		},
	],
	profile: [
		{
			icon: 'solar:user-circle-line-duotone',
			label: 'Your profile',
			action: 'profile',
		},
		{
			icon: 'solar:sun-line-duotone',
			label: 'Appearance',
			action: 'appearance',
		},
		{
			icon: 'solar:settings-line-duotone',
			label: 'Settings',
			action: 'settings',
		},
		{
			icon: 'solar:bell-line-duotone',
			label: 'Notifications',
			action: 'notifications',
		},
	],
	premium: [
		{
			icon: 'solar:star-bold',
			label: 'Upgrade to Pro',
			action: 'upgrade',
			iconClass: 'text-amber-600',
			badge: {
				text: '20% off',
				className: 'bg-amber-600 text-white text-[11px]',
			},
		},
		{
			icon: 'solar:gift-line-duotone',
			label: 'Referrals',
			action: 'referrals',
		},
	],
	support: [
		{
			icon: 'solar:download-line-duotone',
			label: 'Download app',
			action: 'download',
		},
		{
			icon: 'solar:letter-unread-line-duotone',
			label: "What's new?",
			action: 'whats-new',
			rightIcon: 'solar:square-top-down-line-duotone',
		},
		{
			icon: 'solar:question-circle-line-duotone',
			label: 'Get help?',
			action: 'help',
			rightIcon: 'solar:square-top-down-line-duotone',
		},
	],
	account: [
		{
			icon: 'solar:users-group-rounded-bold-duotone',
			label: 'Switch account',
			action: 'switch',
			showAvatar: false,
		},
		{ icon: 'solar:logout-2-bold-duotone', label: 'Log out', action: 'logout' },
	],
}

type MenuItem = {
	icon: string
	label: string
	action: string
	iconClass?: string
	badge?: { text: string; className: string }
	rightIcon?: string
	showAvatar?: boolean
}

export const UserDropdown = ({
	user = {
		name: 'Ayman Echakar',
		username: '@aymanch-03',
		avatar: 'https://avatars.githubusercontent.com/u/126724835?v=4',
		initials: 'AE',
		status: 'online',
	},
	onAction = (_action: string) => {
		// Default no-op handler
	},
	onStatusChange = () => {
		// Default no-op handler
	},
	selectedStatus = 'online',
	promoDiscount = '20% off',
}): React.JSX.Element => {
	const renderMenuItem = (item: MenuItem) => (
		<DropdownMenuItem
			className={cn(
				item.badge || item.showAvatar || item.rightIcon
					? 'justify-between'
					: '',
				'cursor-pointer rounded-lg p-2'
			)}
			key={`${item.action}-${item.label}`}
			onClick={() => onAction(item.action)}
		>
			<span className="flex items-center gap-1.5 font-medium">
				<Icon
					className={`size-5 ${item.iconClass || 'text-muted-foreground'}`}
					icon={item.icon}
				/>
				{item.label}
			</span>
			{item.badge && (
				<Badge className={item.badge.className}>
					{promoDiscount || item.badge.text}
				</Badge>
			)}
			{item.rightIcon && (
				<Icon className="size-4 text-muted-foreground" icon={item.rightIcon} />
			)}
			{item.showAvatar && (
				<Avatar className="size-6 cursor-pointer border border-white shadow dark:border-gray-700">
					<AvatarImage alt={user.name} src={user.avatar} />
					<AvatarFallback>{user.initials}</AvatarFallback>
				</Avatar>
			)}
		</DropdownMenuItem>
	)

	const getStatusColor = (status: string) => {
		const colors: Record<string, string> = {
			online:
				'text-green-600 bg-green-100 border-green-300 dark:text-green-400 dark:bg-green-900/30 dark:border-green-500/50',
			offline:
				'text-gray-600 bg-gray-100 border-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:border-gray-600',
			busy: 'text-red-600 bg-red-100 border-red-300 dark:text-red-400 dark:bg-red-900/30 dark:border-red-500/50',
		}
		return colors[status.toLowerCase()] || colors.online
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Avatar className="size-10 cursor-pointer border border-border">
					<AvatarImage alt={user.name} src={user.avatar} />
					<AvatarFallback>{user.initials}</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="no-scrollbar w-[310px] rounded-2xl bg-popover p-0 text-popover-foreground"
			>
				<section className="rounded-2xl border border-border bg-card p-1 shadow backdrop-blur-lg">
					<div className="flex items-center p-2">
						<div className="flex flex-1 items-center gap-2">
							<Avatar className="size-10 cursor-pointer border border-border">
								<AvatarImage alt={user.name} src={user.avatar} />
								<AvatarFallback>{user.initials}</AvatarFallback>
							</Avatar>
							<div>
								<h3 className="font-semibold text-foreground text-sm">
									{user.name}
								</h3>
								<p className="text-muted-foreground text-xs">{user.username}</p>
							</div>
						</div>
						<Badge
							className={`${getStatusColor(user.status)} rounded-sm border-[0.5px] text-[11px] capitalize`}
						>
							{user.status}
						</Badge>
					</div>

					<DropdownMenuGroup>
						<DropdownMenuSub>
							<DropdownMenuSubTrigger className="cursor-pointer rounded-lg p-2">
								<span className="flex items-center gap-1.5 font-medium text-muted-foreground">
									<Icon
										className="size-5 text-muted-foreground"
										icon="solar:smile-circle-line-duotone"
									/>
									Update status
								</span>
							</DropdownMenuSubTrigger>
							<DropdownMenuPortal>
								<DropdownMenuSubContent className="bg-popover text-popover-foreground backdrop-blur-lg">
									<DropdownMenuRadioGroup
										onValueChange={onStatusChange}
										value={selectedStatus}
									>
										{MENU_ITEMS.status.map((status) => (
											<DropdownMenuRadioItem
												className="gap-2"
												key={status.value}
												value={status.value}
											>
												<Icon
													className="size-5 text-muted-foreground"
													icon={status.icon}
												/>
												{status.label}
											</DropdownMenuRadioItem>
										))}
									</DropdownMenuRadioGroup>
								</DropdownMenuSubContent>
							</DropdownMenuPortal>
						</DropdownMenuSub>
					</DropdownMenuGroup>

					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						{MENU_ITEMS.profile.map(renderMenuItem)}
					</DropdownMenuGroup>

					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						{MENU_ITEMS.premium.map(renderMenuItem)}
					</DropdownMenuGroup>

					<DropdownMenuSeparator />
					<DropdownMenuGroup>
						{MENU_ITEMS.support.map(renderMenuItem)}
					</DropdownMenuGroup>
				</section>

				<section className="mt-1 rounded-2xl p-1">
					<DropdownMenuGroup>
						{MENU_ITEMS.account.map(renderMenuItem)}
					</DropdownMenuGroup>
				</section>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
