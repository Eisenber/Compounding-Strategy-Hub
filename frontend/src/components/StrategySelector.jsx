import { memo } from 'react';
import { Gem, Percent, TrendingUp } from 'lucide-react';

const STRATEGIES = [
  {
    code: 'LOW_VALUATION',
    name: '低估值',
    icon: Gem,
    description: '筛选估值较低且盈利未明显恶化的公司',
    what: '适合关注"价格相对便宜"标的的投资者',
    defaults: 'PE ≤ 15、PB ≤ 1.8、ROE ≥ 8%、无 ST / 停牌',
  },
  {
    code: 'HIGH_DIVIDEND',
    name: '高股息',
    icon: Percent,
    description: '筛选股息率较高且分红相对稳定的公司',
    what: '适合偏好稳健分红、关注现金流回报的投资者',
    defaults: '股息率 ≥ 4%、ROE ≥ 8%、负债率 ≤ 70%、有连续分红',
  },
  {
    code: 'QUALITY_GROWTH',
    name: '质量成长',
    icon: TrendingUp,
    description: '筛选盈利质量和成长性较好的公司',
    what: '适合偏好业绩质量与成长性的投资者',
    defaults: 'ROE ≥ 12%、营收增长 ≥ 15%、净利润增长 ≥ 15%、PE ≤ 40',
  },
];

const StrategySelector = memo(function StrategySelector({ selected, onSelect }) {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {STRATEGIES.map((s) => {
        const isActive = selected === s.code;
        return (
          <button
            key={s.code}
            onClick={() => onSelect(s.code)}
            className={`card p-5 text-left transition-all duration-200 hover:shadow-card-hover ${
              isActive
                ? 'ring-2 ring-gold-400 shadow-glow bg-gradient-to-b from-white to-gold-50/20'
                : ''
            }`}
          >
            {/* Icon */}
            <div
              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${
                isActive ? 'bg-gold-100 text-gold-600' : 'bg-cream-100 text-ink-500'
              }`}
            >
              <s.icon size={20} />
            </div>

            {/* Name */}
            <h3
              className={`font-semibold text-base mb-1 ${
                isActive ? 'text-gold-700' : 'text-ink-800'
              }`}
            >
              {s.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-ink-500 mb-2 leading-relaxed">
              {s.description}
            </p>

            {/* Default rules */}
            <p className="text-xs text-ink-400 leading-relaxed">
              {s.defaults}
            </p>
          </button>
        );
      })}
    </div>
  );
});

export default StrategySelector;
export { STRATEGIES };
