import { memo, useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, Search } from 'lucide-react';

/**
 * Default filter values for each strategy.
 * Keys match the backend ScreenRequestDTO.filters field names.
 */
const DEFAULT_FILTERS = {
  LOW_VALUATION: {
    maxPe: 15,
    maxPb: 1.8,
    minRoe: 8,
    minProfitGrowth: 0,
    excludeSt: true,
    excludeSuspended: true,
    minListingDays: 180,
  },
  HIGH_DIVIDEND: {
    minDividendYield: 4,
    minRoe: 8,
    maxDebtRatio: 70,
    excludeSt: true,
    excludeSuspended: true,
  },
  QUALITY_GROWTH: {
    minRoe: 12,
    minRevenueGrowth: 15,
    minProfitGrowth: 15,
    maxDebtRatio: 60,
    maxPe: 40,
    excludeSt: true,
    excludeSuspended: true,
  },
};

/**
 * Label and step config for each filter field.
 * `shortLabel` is used in the compact form row.
 */
const FILTER_META = {
  maxPe: { label: 'PE(TTM) 上限', shortLabel: 'PE上限', step: 1, min: 1, max: 200, unit: '' },
  maxPb: { label: 'PB 上限', shortLabel: 'PB上限', step: 0.1, min: 0.1, max: 20, unit: '' },
  minRoe: { label: 'ROE 下限（%）', shortLabel: 'ROE≥', step: 1, min: 0, max: 50, unit: '%' },
  minProfitGrowth: { label: '净利润增长率下限（%）', shortLabel: '利润增长≥', step: 1, min: -100, max: 200, unit: '%' },
  minDividendYield: { label: '股息率下限（%）', shortLabel: '股息率≥', step: 0.1, min: 0, max: 20, unit: '%' },
  maxDebtRatio: { label: '资产负债率上限（%）', shortLabel: '负债率≤', step: 1, min: 0, max: 100, unit: '%' },
  minRevenueGrowth: { label: '营收增长率下限（%）', shortLabel: '营收增长≥', step: 1, min: -100, max: 200, unit: '%' },
};

const FilterPanel = memo(function FilterPanel({ strategyCode, onScreen, loading }) {
  const [filters, setFilters] = useState({});

  // Reset to defaults when strategy changes
  useEffect(() => {
    const defaults = DEFAULT_FILTERS[strategyCode] || {};
    setFilters({ ...defaults });
  }, [strategyCode]);

  const handleChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    const defaults = DEFAULT_FILTERS[strategyCode] || {};
    setFilters({ ...defaults });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onScreen) onScreen(filters);
  };

  const visibleKeys = Object.keys(filters).filter(
    (k) => k in FILTER_META
  );

  const hasChanges = (() => {
    const defaults = DEFAULT_FILTERS[strategyCode] || {};
    for (const k of visibleKeys) {
      if (filters[k] !== defaults[k]) return true;
    }
    return false;
  })();

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <SlidersHorizontal size={16} className="text-ink-500" />
        <h3 className="text-sm font-semibold text-ink-700">筛选条件</h3>
        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-700 transition-colors"
          >
            <RotateCcw size={12} />
            恢复默认
          </button>
        )}
      </div>

      {/* Filter fields */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {visibleKeys.map((key) => {
          const meta = FILTER_META[key];
          return (
            <div key={key}>
              <label className="input-label text-xs">{meta.shortLabel || meta.label}</label>
              <div className="relative">
                <input
                  type="number"
                  value={filters[key] ?? ''}
                  onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
                  step={meta.step}
                  min={meta.min}
                  max={meta.max}
                  className="input-field text-sm pr-8"
                />
                {meta.unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-400">
                    {meta.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Boolean toggles */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        {Object.prototype.hasOwnProperty.call(filters, 'excludeSt') && (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.excludeSt}
              onChange={(e) => handleChange('excludeSt', e.target.checked)}
              className="w-4 h-4 rounded border-cream-300 text-gold-500 focus:ring-gold-400/20"
            />
            <span className="text-sm text-ink-600">排除 ST</span>
          </label>
        )}
        {Object.prototype.hasOwnProperty.call(filters, 'excludeSuspended') && (
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.excludeSuspended}
              onChange={(e) => handleChange('excludeSuspended', e.target.checked)}
              className="w-4 h-4 rounded border-cream-300 text-gold-500 focus:ring-gold-400/20"
            />
            <span className="text-sm text-ink-600">排除停牌</span>
          </label>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-gold px-6 py-2.5 text-sm rounded-xl shadow-sm"
      >
        <Search size={15} />
        {loading ? '筛选中...' : '开始筛选'}
      </button>
    </form>
  );
});

export default FilterPanel;
export { DEFAULT_FILTERS };
