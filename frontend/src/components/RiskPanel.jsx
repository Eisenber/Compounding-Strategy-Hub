import { memo } from 'react';
import { AlertTriangle, Info, ShieldAlert, ChevronRight } from 'lucide-react';

const GENERAL_RISKS = [
  '指标筛选只能帮助缩小研究范围，不能替代深入分析',
  '财务指标基于历史数据，存在一定滞后性',
  '单一策略可能在某些市场环境下失效',
  '过去表现不代表未来结果',
];

const RISK_TEXT_MAP = {
  LOW_VALUATION: {
    title: '低估值策略风险',
    items: [
      '低估值不等于股价一定上涨，可能存在"价值陷阱"',
      '低 PE / PB 可能是行业周期下行或基本面恶化的信号',
      '部分公司可能长期维持低估值状态',
    ],
  },
  HIGH_DIVIDEND: {
    title: '高股息策略风险',
    items: [
      '高股息可能是股价大幅下跌导致股息率被动上升',
      '公司分红政策可能发生变化，历史分红不保证未来分红',
      '高负债率公司可能在经营恶化时削减或取消分红',
    ],
  },
  QUALITY_GROWTH: {
    title: '质量成长策略风险',
    items: [
      '高成长公司通常伴随更高的估值和波动',
      '营收与利润的高增长可能难以持续',
      '行业竞争加剧或市场环境变化可能影响成长速度',
    ],
  },
};

const INDICATOR_EXPLANATIONS = [
  { name: 'PE（TTM）', text: '滚动市盈率，当前股价 ÷ 近12个月每股收益。数值越低，回本周期越短。' },
  { name: 'PB', text: '市净率，当前股价 ÷ 每股净资产。PB < 1 意味着股价低于每股净资产。' },
  { name: 'ROE', text: '净资产收益率，净利润 ÷ 平均净资产。衡量公司利用股东资金创造利润的能力，越高说明资本运用效率越好。' },
  { name: '营收增长率', text: '营业收入同比增长率，反映公司业务的扩张速度与市场拓展能力。' },
  { name: '净利润增长率', text: '归属净利润同比增长率，反映公司盈利能力的提升速度与经营质量变化。' },
  { name: '股息率', text: '近12个月每股分红 ÷ 当前股价，反映投资者能从分红中获得的现金回报率。' },
  { name: '资产负债率', text: '总负债 ÷ 总资产，衡量公司财务杠杆水平。比率过高意味着偿债压力较大、财务风险较高。' },
];

const RiskPanel = memo(function RiskPanel({ strategyCode }) {
  const strategyRisk = RISK_TEXT_MAP[strategyCode];

  return (
    <div className="space-y-4">
      {/* ── Disclaimer ── */}
      <div className="card p-4 bg-cream-50/80 border border-cream-200/80">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gold-100 shrink-0">
            <ShieldAlert size={16} className="text-gold-600" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-800 mb-1">免责声明</p>
            <p className="text-xs text-ink-500 leading-relaxed">
              本工具仅用于股票筛选与信息展示，<strong className="text-ink-700">不构成任何投资建议</strong>。
              筛选结果不代表买卖推荐，请结合自身情况独立决策。投资有风险，入市需谨慎。
            </p>
          </div>
        </div>
      </div>

      {/* ── Strategy-specific risks ── */}
      {strategyRisk && (
        <div className="card p-4">
          <div className="flex items-center gap-2.5 mb-3">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100">
              <AlertTriangle size={14} className="text-amber-600" />
            </span>
            <h4 className="text-sm font-semibold text-ink-800">{strategyRisk.title}</h4>
          </div>
          <ul className="space-y-2">
            {strategyRisk.items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ink-600 leading-relaxed">
                <ChevronRight size={12} className="text-ink-300 shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── General tips ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-ink-100">
            <AlertTriangle size={14} className="text-ink-500" />
          </span>
          <h4 className="text-sm font-semibold text-ink-800">使用提示</h4>
        </div>
        <ul className="space-y-2">
          {GENERAL_RISKS.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-ink-600 leading-relaxed">
              <ChevronRight size={12} className="text-ink-300 shrink-0 mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Indicator explanations ── */}
      <div className="card p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50">
            <Info size={14} className="text-blue-500" />
          </span>
          <h4 className="text-sm font-semibold text-ink-800">指标解释</h4>
        </div>
        <dl className="space-y-3">
          {INDICATOR_EXPLANATIONS.map((ind) => (
            <div key={ind.name} className="pl-3 border-l-2 border-cream-200 hover:border-gold-300 transition-colors">
              <dt className="text-xs font-semibold text-ink-700 mb-0.5">{ind.name}</dt>
              <dd className="text-xs text-ink-500 leading-relaxed">{ind.text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
});

export default RiskPanel;
export { RISK_TEXT_MAP };
