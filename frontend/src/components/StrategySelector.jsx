import { memo } from 'react';
import { Gem, Percent, TrendingUp, Check, Activity, Sparkles } from 'lucide-react';

const STRATEGIES = [
  {
    code: 'LOW_VALUATION',
    name: '低估值策略',
    icon: Gem,
    description: '筛选估值较低且盈利未明显恶化的公司',
    what: '适合关注"价格相对便宜"标的的投资者',
    defaults: 'PE ≤ 15 · PB ≤ 1.8 · ROE ≥ 8% · 无 ST / 停牌',
  },
  {
    code: 'HIGH_DIVIDEND',
    name: '高股息策略',
    icon: Percent,
    description: '筛选股息率较高且分红相对稳定的公司',
    what: '适合偏好稳健分红、关注现金流回报的投资者',
    defaults: '股息率 ≥ 4% · ROE ≥ 8% · 负债率 ≤ 70% · 连续分红',
  },
  {
    code: 'QUALITY_GROWTH',
    name: '质量成长策略',
    icon: TrendingUp,
    description: '筛选盈利质量和成长性较好的公司',
    what: '适合偏好业绩质量与成长性的投资者',
    defaults: 'ROE ≥ 12% · 营收增长 ≥ 15% · 净利润增长 ≥ 15% · PE ≤ 40',
  },
  {
    code: 'PEG_VALUATION',
    name: 'PEG估值策略',
    icon: Activity,
    description: '用PEG指标寻找成长被低估的公司',
    what: '适合关注成长性价比的投资者',
    defaults: 'PEG ≤ 1.0 · ROE ≥ 10% · 利润增长 ≥ 10% · PE ≤ 50',
  },
  {
    code: 'MAGIC_FORMULA',
    name: '魔法公式策略',
    icon: Sparkles,
    description: '彼得·林奇经典 — 好公司 + 好价格',
    what: '适合看重基本面质量与买入价格的投资者',
    defaults: 'ROE ≥ 15% · PE ≤ 25 · 负债率 ≤ 50%',
  },
];

const StrategySelector = memo(function StrategySelector({ selected, onSelect }) {
  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {STRATEGIES.map((s) => {
        const isActive = selected === s.code;
        const Icon = s.icon;
        return (
          <button
            key={s.code}
            onClick={() => onSelect(s.code)}
            className={`
              relative card p-5 text-left transition-all duration-300 ease-out
              hover:shadow-card-hover
              ${isActive
                ? 'ring-2 ring-gold-400 ring-offset-1 shadow-glow bg-gradient-to-br from-white via-white to-gold-50/30'
                : 'hover:ring-1 hover:ring-cream-300'
              }
            `}
          >
            {/* Active indicator */}
            {isActive && (
              <span className="absolute top-3 right-3 inline-flex items-center justify-center
                               w-5 h-5 rounded-full bg-gold-500 text-white">
                <Check size={11} strokeWidth={3} />
              </span>
            )}

            {/* Icon */}
            <span
              className={`
                inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3
                transition-colors duration-300
                ${isActive
                  ? 'bg-gold-100 text-gold-600'
                  : 'bg-cream-100 text-ink-400'
                }
              `}
            >
              <Icon size={20} />
            </span>

            {/* Name */}
            <h3
              className={`
                font-semibold text-base mb-1 transition-colors duration-300
                ${isActive ? 'text-ink-900' : 'text-ink-700'}
              `}
            >
              {s.name}
            </h3>

            {/* Description */}
            <p className="text-sm text-ink-500 mb-2 leading-relaxed">
              {s.description}
            </p>

            {/* Default rules */}
            <div className={`
              text-2xs leading-relaxed rounded-lg px-2.5 py-2
              transition-colors duration-300
              ${isActive
                ? 'bg-gold-50/60 text-gold-700 font-medium'
                : 'bg-cream-50 text-ink-400'
              }
            `}>
              {s.defaults}
            </div>
          </button>
        );
      })}
    </div>
  );
});

export default StrategySelector;
export { STRATEGIES };
