import flags from 'react-phone-number-input/flags'

type CountryCode = keyof typeof flags
type FlagProps = {
	country: CountryCode | string
	title?: string
	className?: string
}

export const Flag: React.FC<FlagProps> = ({ country, title, className }) => {
	const Cmp = flags[country as CountryCode]
	return (
		<span
			className={`flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg:not([class*='size-'])]:size-full ${
				className || ''
			}`}
		>
			{Cmp ? <Cmp title={title ?? ''} /> : null}
		</span>
	)
}
