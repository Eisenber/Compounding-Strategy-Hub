import { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const CHART_COLORS = [
  '#C8963E', // gold
  '#3B82C4', // blue
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F43F5E', // rose
];

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/**
 * Transform per-scenario yearlyPoints into Recharts-friendly shape:
 * [{ year: 1, "方案A": 75000, "方案B": 78120, ... }, ...]
 */
function transformData(scenarios) {
  if (!scenarios || scenarios.length === 0) return [];

  const maxYears = Math.max(
    ...scenarios.map((s) =>
      s.yearlyPoints.length > 0
        ? s.yearlyPoints[s.yearlyPoints.length - 1].year
        : 0
    )
  );

  const data = [];
  for (let y = 1; y <= maxYears; y++) {
    const point = { year: y };
    scenarios.forEach((s) => {
      const yp = s.yearlyPoints.find((p) => p.year === y);
      point[s.name] = yp ? Math.round(yp.amount) : null;
    });
    data.push(point);
  }
  return data;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-ink-100 rounded-xl px-4 py-3 shadow-lg">
      <p className="text-xs font-semibold text-ink-400 mb-2">第 {label} 年</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-ink-500">{entry.name}</span>
          <span className="num font-semibold text-ink-800 ml-2">
            {moneyFormatter.format(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }) => {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-2">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-1.5 text-xs">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-ink-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const ComparisonChart = memo(function ComparisonChart({ scenarios }) {
  const data = transformData(scenarios);

  if (data.length === 0) {
    return (
      <div className="card p-8 text-center text-ink-400 text-sm">
        暂无图表数据
      </div>
    );
  }

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-ink-800 mb-1">年度资产增长曲线</h3>
      <p className="text-xs text-ink-400 mb-6">
        展示各方案每年末的累计资产变化趋势
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E4E5EA"
            strokeWidth={0.5}
          />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 12, fill: '#73778F' }}
            tickLine={false}
            axisLine={{ stroke: '#E4E5EA' }}
            label={{
              value: '年',
              position: 'insideBottomRight',
              offset: -5,
              style: { fontSize: 12, fill: '#A1A4B5' },
            }}
          />
          <YAxis
            tickFormatter={(v) =>
              v >= 10000 ? `${(v / 10000).toFixed(0)}万` : v
            }
            tick={{ fontSize: 12, fill: '#73778F' }}
            tickLine={false}
            axisLine={false}
            width={55}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          {scenarios.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              name={s.name}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={s.name === scenarios[0]?.name ? 2.5 : 1.8}
              dot={false}
              activeDot={{
                r: 5,
                strokeWidth: 2,
                stroke: '#fff',
                fill: CHART_COLORS[i % CHART_COLORS.length],
              }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ComparisonChart;
