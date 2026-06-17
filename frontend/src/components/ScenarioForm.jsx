import { memo } from 'react';
import { Trash2, Crown } from 'lucide-react';

const FIELD_CONFIG = [
  { key: 'name', label: '方案名称', type: 'text', placeholder: '例如：沪深300 ETF', short: true },
  { key: 'initialPrincipal', label: '初始本金（元）', type: 'number', min: 0, step: 1000, short: true },
  { key: 'monthlyContribution', label: '每月定投（元）', type: 'number', min: 0, step: 100, short: true },
  { key: 'years', label: '投资年限', type: 'number', min: 1, max: 50, step: 1, short: true },
  { key: 'annualReturnRate', label: '预期年化收益率（%）', type: 'number', min: 0, max: 100, step: 0.1, short: true },
  { key: 'annualFeeRate', label: '年费率（%）', type: 'number', min: 0, max: 10, step: 0.01, short: true },
  { key: 'inflationRate', label: '通胀率（%）', type: 'number', min: 0, max: 20, step: 0.1, short: false },
];

const ScenarioForm = memo(function ScenarioForm({
  index,
  scenario,
  onChange,
  onRemove,
  canRemove,
  isBest,
}) {
  return (
    <div
      className={`card p-5 relative transition-all duration-300 ${
        isBest
          ? 'ring-2 ring-gold-400 shadow-glow'
          : ''
      }`}
    >
      {/* Best badge */}
      {isBest && (
        <div className="absolute -top-2.5 left-4 badge-best gap-1 shadow-sm">
          <Crown size={11} />
          最优方案
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-ink-400 bg-cream-100 px-2.5 py-1 rounded-lg">
          方案 {index + 1}
        </span>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-ink-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="删除方案"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-3.5">
        {FIELD_CONFIG.map((field) => (
          <div key={field.key}>
            <label className="input-label">
              {field.label}
            </label>
            <input
              type={field.type}
              value={scenario[field.key]}
              onChange={(e) => {
                const val =
                  field.type === 'number'
                    ? e.target.value
                    : e.target.value;
                onChange(field.key, val);
              }}
              placeholder={field.placeholder}
              min={field.min}
              max={field.max}
              step={field.step}
              className="input-field text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
});

export default ScenarioForm;
