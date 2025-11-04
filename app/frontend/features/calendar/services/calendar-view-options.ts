import { i18n } from '@shared/libs/i18n'
import { Calendar, Grid3X3, List } from 'lucide-react'

export const getCalendarViewOptions = (isLocalized: boolean) => [
	{
		value: 'multiMonthYear',
		label: i18n.getMessage('view_year', isLocalized),
		icon: Grid3X3,
	},
	{
		value: 'dayGridMonth',
		label: i18n.getMessage('view_month', isLocalized),
		icon: Calendar,
	},
	{
		value: 'timeGridWeek',
		label: i18n.getMessage('view_week', isLocalized),
		icon: Calendar,
	},
	{
		value: 'listMonth',
		label: i18n.getMessage('view_list', isLocalized),
		icon: List,
	},
]
