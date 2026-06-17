import { memo } from 'react';
import { Lightbulb, TrendingUp } from 'lucide-react';

const InsightsPanel = memo(function InsightsPanel({ insights, bestName }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="card p-6 bg-gradient-to-br from-ink-900 to-ink-800 text-white">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb size={18} className="text-gold-400" />
        <h3 className="font-semibold text-white">分析结论</h3>
      </div>

      {/* Best callout */}
      {bestName && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-white/10 rounded-xl border border-white/10">
          <TrendingUp size={16} className="text-gold-400 shrink-0" />
          <p className="text-sm text-cream-100">
            在当前参数下，
            <span className="font-semibold text-gold-300">「{bestName}」</span>
            表现最优
          </p>
        </div>
      )}

      {/* Insight list */}
      <ul className="space-y-3">
        {insights.map((text, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-200 leading-relaxed">
            <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 text-xs flex items-center justify-center text-gold-400 font-medium mt-0.5">
              {i + 1}
            </span>
            {text}
          </li>
        ))}
      </ul>

      <p className="mt-5 pt-4 border-t border-white/10 text-xs text-ink-400">
        * 以上结论基于你输入的参数自动生成，仅供参考。
      </p>
    </div>
  );
});

export default InsightsPanel;
