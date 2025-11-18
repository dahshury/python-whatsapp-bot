export const getSizeClasses = (componentSize: 'sm' | 'default' | 'lg') => {
	switch (componentSize) {
		case 'sm':
			return 'h-8 px-2 text-xs'
		case 'lg':
			return 'h-12 px-4 text-base'
		default:
			return 'h-10 px-3 text-sm'
	}
}
