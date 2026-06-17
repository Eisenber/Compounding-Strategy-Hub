import { memo } from 'react';
import { Crown, TrendingUp, Wallet, DollarSign, Target } from 'lucide-react';

const formatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const pctFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

const multipleFormatter = new Intl.NumberFormat('zh-CN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ResultCard = memo(function ResultCard({ scenario, rank, isBest }) {
  const profitPct =
    scenario.totalInvested > 0
      ? (scenario.totalProfit / scenario.totalInvested) * 100
      : 0;

  return (
    <div
      className={`card p-6 relative transition-all duration-300 ${
        isBest
          ? 'ring-2 ring-gold-400 shadow-glow bg-gradient-to-b from-white to-gold-50/30'
          : ''
      }`}
    >
      {/* Best Badge */}
      {isBest && (
        <div className="absolute -top-2.5 left-4 badge-best gap-1 shadow-sm">
          <Crown size={11} />
          最优方案
        </div>
      )}

      {/* Name and Rank */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xs font-bold text-ink-400 bg-cream-100 w-6 h-6 rounded-full flex items-center justify-center">
          {rank}
        </span>
        <h3 className="font-semibold text-ink-800 text-base truncate">
          {scenario.name}
        </h3>
      </div>

      {/* Key Metric: Final Amount */}
      <div className="mb-5 pb-5 border-b border-cream-200">
        <p className="text-xs text-ink-400 mb-1">最终资产</p>
        <p
          className={`num text-2xl font-bold tracking-tight ${
            isBest ? 'text-gold-700' : 'text-ink-900'
          }`}
        >
          {formatter.format(scenario.finalAmount)}
        </p>
      </div>

      {/* Detail Metrics */}
      <div className="space-y-3">
        <MetricRow
          icon={Wallet}
          label="总投入"
          value={formatter.format(scenario.totalInvested)}
        />
        <MetricRow
          icon={TrendingUp}
          label="总收益"
          value={`${formatter.format(scenario.totalProfit)}（${pctFormatter.format(profitPct / 100)}）`}
          positive={scenario.totalProfit > 0}
        />
        <MetricRow
          icon={DollarSign}
          label="收益倍数"
          value={`${multipleFormatter.format(scenario.profitMultiple)} 倍`}
        />
        <MetricRow
          icon={Target}
          label="实际购买力"
          value={formatter.format(scenario.realFinalAmount)}
          hint="扣除通胀后"
        />
      </div>
    </div>
  );
});

function MetricRow({ icon: Icon, label, value, positive, hint }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon
        size={15}
        className={`mt-0.5 shrink-0 ${
          positive === true
            ? 'text-emerald-500'
            : positive === false
            ? 'text-red-400'
            : 'text-ink-400'
        }`}
      />
      <div className="min-w-0">
        <p className="text-xs text-ink-400">{label}</p>
        <p
          className={`text-sm font-semibold num ${
            positive === true
              ? 'text-emerald-600'
              : positive === false
              ? 'text-red-500'
              : 'text-ink-700'
          }`}
        >
          {value}
        </p>
        {hint && <p className="text-xs text-ink-400 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}

export default ResultCard;
