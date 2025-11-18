import { cn } from '@shared/libs/utils'
import flags from 'react-phone-number-input/flags'

type CountryCode = keyof typeof flags
type FlagProps = {
	country: CountryCode | string
	title?: string
	className?: string
	showBackground?: boolean
}

export const Flag: React.FC<FlagProps> = ({
	country,
	title,
	className,
	showBackground = true,
}) => {
	const Cmp = flags[country as CountryCode]
	return (
		<span
			className={cn(
				"flex h-4 w-6 overflow-hidden rounded-sm [&_svg:not([class*='size-'])]:size-full",
				showBackground && 'bg-foreground/20',
				className
			)}
		>
			{Cmp ? <Cmp title={title ?? ''} /> : null}
		</span>
	)
}
