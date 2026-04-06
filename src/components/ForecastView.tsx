import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { computeSMA, computeEWMA, type TimeSeriesData } from '@/lib/forecasting';
import { Slider } from '@/components/ui/slider';

interface Props {
  data: TimeSeriesData;
  onBack: () => void;
}

export default function ForecastView({ data, onBack }: Props) {
  const [mode, setMode] = useState<'sma' | 'ewma'>('sma');
  const [n, setN] = useState(data.values.length);
  const [alpha, setAlpha] = useState(0.3);
  const [smaForecastCount, setSmaForecastCount] = useState(5);
  const forecastCount = mode === 'ewma' ? 1 : smaForecastCount;

  const maxN = data.values.length;

  const forecasts = useMemo(() => {
    if (mode === 'sma') return computeSMA(data.values, n, forecastCount);
    return computeEWMA(data.values, alpha, forecastCount);
  }, [mode, n, alpha, forecastCount, data.values]);

  const futureLabels = useMemo(() => {
    const labels = data.labels;
    const len = labels.length;
    // Try to detect interval from last two dates
    const d1 = new Date(labels[len - 2]);
    const d2 = new Date(labels[len - 1]);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      const diffMs = d2.getTime() - d1.getTime();
      return Array.from({ length: forecastCount }, (_, i) => {
        const future = new Date(d2.getTime() + diffMs * (i + 1));
        return future.toISOString().split('T')[0];
      });
    }
    // Numeric fallback
    const n1 = Number(labels[len - 2]);
    const n2 = Number(labels[len - 1]);
    if (!isNaN(n1) && !isNaN(n2)) {
      const step = n2 - n1;
      return Array.from({ length: forecastCount }, (_, i) => String(n2 + step * (i + 1)));
    }
    return Array.from({ length: forecastCount }, (_, i) => `F${i + 1}`);
  }, [data.labels, forecastCount]);

  const chartData = useMemo(() => {
    const points = data.labels.map((label, i) => ({
      name: label,
      Actual: data.values[i],
      Forecast: null as number | null,
    }));
    if (points.length > 0) {
      points[points.length - 1].Forecast = data.values[data.values.length - 1];
    }
    forecasts.forEach((val, i) => {
      points.push({
        name: futureLabels[i],
        Actual: null as number | null,
        Forecast: val,
      });
    });
    // Add empty padding point to the right
    points.push({ name: '', Actual: null, Forecast: null });
    return points;
  }, [data, forecasts, futureLabels]);

  const yDomain = useMemo(() => {
    const allVals = [...data.values, ...forecasts];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const padding = (max - min) * 0.15 || max * 0.1 || 1;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [data.values, forecasts]);

  const latestForecast = forecasts.length > 0 ? forecasts[0] : null;

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-2xl font-bold gradient-text">Forecast Results</h1>
          <div className="w-20" />
        </div>

        {/* Toggle & Controls */}
        <div className="glass rounded-2xl p-6 space-y-6">
          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-1 p-1 bg-secondary rounded-xl w-fit mx-auto">
            {(['sma', 'ewma'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  mode === m ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'sma' ? 'SMA' : 'EWMA'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* N / Alpha control */}
            {mode === 'sma' ? (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  Window Size (n) — <span className="text-primary font-mono">{n}</span>
                </label>
                <Slider
                  value={[n]}
                  onValueChange={([v]) => setN(v)}
                  min={2}
                  max={maxN}
                  step={1}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  Smoothing Factor (α) — <span className="text-primary font-mono">{alpha.toFixed(2)}</span>
                </label>
                <Slider
                  value={[alpha * 100]}
                  onValueChange={([v]) => setAlpha(v / 100)}
                  min={1}
                  max={99}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Forecast count */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Predictions — <span className="text-primary font-mono">{forecastCount}</span>
                {mode === 'ewma' && <span className="text-xs ml-2">(fixed at 1 for EWMA)</span>}
              </label>
              <Slider
                value={[forecastCount]}
                onValueChange={([v]) => setSmaForecastCount(v)}
                min={1}
                max={20}
                step={1}
                className="w-full"
                disabled={mode === 'ewma'}
              />
            </div>
          </div>
        </div>

        {/* Forecast number */}
        <motion.div
          key={`${mode}-${n}-${alpha}-${forecastCount}`}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Next Forecast — {futureLabels[0]} ({mode.toUpperCase()})</p>
              <p className="text-3xl font-bold font-mono text-foreground">{latestForecast ?? '—'}</p>
            </div>
          </div>
          <div className="text-right space-y-1">
            {forecasts.map((f, i) => (
              <p key={i} className="text-sm font-mono text-muted-foreground">
                {futureLabels[i]}: <span className="text-foreground">{f}</span>
              </p>
            ))}
          </div>
        </motion.div>

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Forecast Chart</h2>
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 18% 18%)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'hsl(220 10% 50%)', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(230 18% 18%)' }}
                angle={-30}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={yDomain}
                tick={{ fill: 'hsl(220 10% 50%)', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(230 18% 18%)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(230 22% 10%)',
                  border: '1px solid hsl(230 18% 18%)',
                  borderRadius: '12px',
                  color: 'hsl(220 20% 92%)',
                }}
              />
              <Legend />
              <ReferenceLine
                x={data.labels[data.labels.length - 1]}
                stroke="hsl(220 10% 30%)"
                strokeDasharray="4 4"
                label={{ value: 'Forecast →', fill: 'hsl(220 10% 50%)', fontSize: 11 }}
              />
              <Line
                type="monotone"
                dataKey="Actual"
                stroke="hsl(160 84% 39%)"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(160 84% 39%)' }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="Forecast"
                stroke="hsl(270 60% 55%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: 'hsl(270 60% 55%)' }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <p className="text-xs text-center text-muted-foreground">
          {mode === 'sma' ? `Simple Moving Average with window n=${n}` : `Exponential Weighted Moving Average with α=${alpha.toFixed(2)}`}
          {' · '}{data.values.length} data points · {forecastCount} predictions
        </p>
      </motion.div>
    </div>
  );
}
