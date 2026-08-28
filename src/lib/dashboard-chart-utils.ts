const CHART_TONES = [
  "var(--chart-blue)",
  "var(--chart-purple)",
  "var(--chart-orange)",
  "var(--chart-green)",
  "var(--bright-purple)",
];

export function withChartTones<T extends { label: string; value: number; color?: string }>(items: T[]) {
  return items.map((item, index) => ({
    ...item,
    color: item.color ?? CHART_TONES[index % CHART_TONES.length],
  }));
}

export function calculatePercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

export function sliceTotal(items: Array<{ value: number }>) {
  return items.reduce((sum, item) => sum + item.value, 0);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}
