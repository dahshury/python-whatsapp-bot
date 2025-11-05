const PERCENT = 100;

export function computeTrend(
  current: number,
  previous: number,
  higherIsBetter = true
): {
  percentChange: number;
  isPositive: boolean;
} {
  if (previous === 0) {
    const percentChange = current > 0 ? PERCENT : 0;
    const isPositive = higherIsBetter ? current > 0 : current === 0;
    return { percentChange, isPositive };
  }
  const raw = ((current - previous) / Math.abs(previous)) * PERCENT;
  const isPositive = higherIsBetter ? raw >= 0 : raw <= 0;
  return { percentChange: raw, isPositive };
}
