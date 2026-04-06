export interface TimeSeriesData {
  labels: string[];
  values: number[];
}

export function computeSMA(values: number[], n: number, forecastCount: number): number[] {
  if (n > values.length) return [];
  const extended = [...values];
  const forecasts: number[] = [];
  for (let i = 0; i < forecastCount; i++) {
    const window = extended.slice(extended.length - n);
    const avg = window.reduce((a, b) => a + b, 0) / n;
    forecasts.push(parseFloat(avg.toFixed(4)));
    extended.push(avg);
  }
  return forecasts;
}

export function computeEWMA(values: number[], alpha: number, forecastCount: number): number[] {
  if (values.length === 0) return [];
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  const forecasts: number[] = [];
  for (let i = 0; i < forecastCount; i++) {
    forecasts.push(parseFloat(ewma.toFixed(4)));
  }
  return forecasts;
}

export function detectTimeSeries(col: (string | number)[]): boolean {
  if (col.length < 2) return false;
  // Try parsing as dates
  const dates = col.map((v) => {
    const d = new Date(String(v));
    if (!isNaN(d.getTime())) return d.getTime();
    return null;
  });
  if (dates.every((d) => d !== null)) {
    for (let i = 1; i < dates.length; i++) {
      if (dates[i]! <= dates[i - 1]!) return false;
    }
    return true;
  }
  // Try as numbers (strictly increasing)
  const nums = col.map((v) => {
    const n = Number(v);
    return isNaN(n) ? null : n;
  });
  if (nums.every((n) => n !== null)) {
    for (let i = 1; i < nums.length; i++) {
      if (nums[i]! <= nums[i - 1]!) return false;
    }
    return true;
  }
  return false;
}

export function isNumericColumn(col: (string | number)[]): boolean {
  return col.every((v) => !isNaN(Number(v)) && String(v).trim() !== '');
}
