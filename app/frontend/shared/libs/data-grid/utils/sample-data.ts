const SEED_MULTIPLIER = 1000;
const RANDOM_SCALE = 10_000;
const DECIMAL_SCALE = 100;
const DATE_YEAR_BASE = 2020;
const YEAR_RANGE = 4;
const MONTHS_RANGE = 12;
const DAYS_RANGE = 28;
const MIN_DAYS = 1;
const OPTIONS_COUNT = 3;
const SAMPLE_OPTIONS = ["Option A", "Option B", "Option C"];
const HOURS_RANGE = 24;
const MINUTES_RANGE = 60;
const BASE_YEAR = 1970;
const MIN_PRICE = 100;
const COLUMN_NAMES = 0;
const COLUMN_OPTIONS = 1;
const COLUMN_PRICE = 2;
const COLUMN_DATE = 3;
const COLUMN_TIME = 4;

export function generateGridSampleData(row: number, col: number): unknown {
	const seed = row * SEED_MULTIPLIER + col;
	const random = () => {
		const x = Math.sin(seed) * RANDOM_SCALE;
		return x - Math.floor(x);
	};

	const sampleNames = [
		"John Smith",
		"Maria Garcia",
		"Ahmed Hassan",
		"Sarah Johnson",
		"Chen Wei",
		"Anna Kowalski",
		"David Brown",
		"Fatima Al-Zahra",
		"Pierre Dubois",
		"Yuki Tanaka",
		"Elena Rodriguez",
		"Michael Davis",
		"Priya Sharma",
		"Lars Andersen",
		"Sofia Rossi",
		"James Wilson",
		"Aisha Okafor",
		"Carlos Mendez",
		"Emma Thompson",
		"Ali Rahman",
	];

	switch (col) {
		case COLUMN_NAMES:
			return sampleNames[row % sampleNames.length];
		case COLUMN_OPTIONS:
			return SAMPLE_OPTIONS[Math.floor(random() * OPTIONS_COUNT)];
		case COLUMN_PRICE:
			return (
				Math.round((random() * RANDOM_SCALE + MIN_PRICE) * DECIMAL_SCALE) /
				DECIMAL_SCALE
			);
		case COLUMN_DATE:
			return new Date(
				DATE_YEAR_BASE + Math.floor(random() * YEAR_RANGE),
				Math.floor(random() * MONTHS_RANGE),
				Math.floor(random() * DAYS_RANGE) + MIN_DAYS
			);
		case COLUMN_TIME:
			return new Date(
				BASE_YEAR,
				0,
				1,
				Math.floor(random() * HOURS_RANGE),
				Math.floor(random() * MINUTES_RANGE)
			);
		default:
			return `Cell ${row},${col}`;
	}
}
