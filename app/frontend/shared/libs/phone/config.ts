// Default country - can be overridden by app config
export const DEFAULT_COUNTRY = 'SA' as const

/**
 * Get default country from app config if available, otherwise use constant.
 * This function should be called from components that have access to app config.
 */
export function getDefaultCountry(
	config?: { default_country_prefix?: string } | null
): typeof DEFAULT_COUNTRY {
	return (config?.default_country_prefix ||
		DEFAULT_COUNTRY) as typeof DEFAULT_COUNTRY
}
