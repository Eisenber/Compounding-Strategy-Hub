import { memo, useState, useEffect } from 'react';
import { SlidersHorizontal, RotateCcw, Search, Loader2 } from 'lucide-react';

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
  PEG_VALUATION: {
    maxPeg: 1.0,
    minRoe: 10,
    minProfitGrowth: 10,
    maxPe: 50,
    excludeSt: true,
    excludeSuspended: true,
    minListingDays: 180,
  },
  MAGIC_FORMULA: {
    minRoe: 15,
    maxPe: 25,
    maxDebtRatio: 50,
    excludeSt: true,
    excludeSuspended: true,
    minListingDays: 365,
  },
};

/**
 * Label and step config for each filter field.
 */
const FILTER_META = {
  maxPe: { label: 'PE(TTM) 上限', shortLabel: 'PE 上限', step: 1, min: 1, max: 200, unit: '' },
  maxPb: { label: 'PB 上限', shortLabel: 'PB 上限', step: 0.1, min: 0.1, max: 20, unit: '' },
  minRoe: { label: 'ROE 下限', shortLabel: 'ROE ≥', step: 1, min: 0, max: 50, unit: '%' },
  minProfitGrowth: { label: '净利润增长率下限', shortLabel: '利润增长 ≥', step: 1, min: -100, max: 200, unit: '%' },
  minDividendYield: { label: '股息率下限', shortLabel: '股息率 ≥', step: 0.1, min: 0, max: 20, unit: '%' },
  maxDebtRatio: { label: '资产负债率上限', shortLabel: '负债率 ≤', step: 1, min: 0, max: 100, unit: '%' },
  minRevenueGrowth: { label: '营收增长率下限', shortLabel: '营收增长 ≥', step: 1, min: -100, max: 200, unit: '%' },
  maxPeg: { label: 'PEG 上限', shortLabel: 'PEG ≤', step: 0.1, min: 0.1, max: 10, unit: '' },
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

  const visibleKeys = Object.keys(filters).filter((k) => k in FILTER_META);
  const booleanKeys = Object.keys(filters).filter(
    (k) => k === 'excludeSt' || k === 'excludeSuspended'
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
      <div className="flex items-center gap-2.5 mb-5">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-ink-50">
          <SlidersHorizontal size={15} className="text-ink-500" />
        </span>
        <h3 className="text-sm font-semibold text-ink-800">筛选条件</h3>
        {hasChanges && (
          <button
            type="button"
            onClick={handleReset}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       text-ink-500 hover:text-ink-700 hover:bg-cream-100 rounded-lg
                       transition-colors"
          >
            <RotateCcw size={11} />
            恢复默认
          </button>
        )}
      </div>

      {/* Filter fields — responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        {visibleKeys.map((key) => {
          const meta = FILTER_META[key];
          if (!meta) return null;
          return (
            <div key={key} className="flex flex-col">
              <label className="text-2xs font-medium text-ink-500 mb-1.5 tracking-wide">
                {meta.shortLabel}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={filters[key] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '' || raw === '-') {
                      handleChange(key, meta.min);
                      return;
                    }
                    handleChange(key, parseFloat(raw) || meta.min);
                  }}
                  step={meta.step}
                  min={meta.min}
                  max={meta.max}
                  className="input-field text-sm pr-9"
                />
                {meta.unit && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-300 font-medium select-none">
                    {meta.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Boolean toggles + submit */}
      <div className="flex flex-wrap items-center gap-5">
        {booleanKeys.length > 0 && (
          <div className="flex items-center gap-5">
            {filters.excludeSt !== undefined && (
              <label className="inline-flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={filters.excludeSt}
                    onChange={(e) => handleChange('excludeSt', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full border-2 border-cream-300 bg-cream-200
                                  peer-checked:bg-gold-500 peer-checked:border-gold-500
                                  transition-all duration-200
                                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                  after:w-3.5 after:h-3.5 after:rounded-full after:bg-white
                                  after:shadow-sm after:transition-transform after:duration-200
                                  peer-checked:after:translate-x-[14px]" />
                </div>
                <span className="text-sm text-ink-600 group-hover:text-ink-800 transition-colors">
                  排除 ST
                </span>
              </label>
            )}
            {filters.excludeSuspended !== undefined && (
              <label className="inline-flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={filters.excludeSuspended}
                    onChange={(e) => handleChange('excludeSuspended', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 rounded-full border-2 border-cream-300 bg-cream-200
                                  peer-checked:bg-gold-500 peer-checked:border-gold-500
                                  transition-all duration-200
                                  after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                                  after:w-3.5 after:h-3.5 after:rounded-full after:bg-white
                                  after:shadow-sm after:transition-transform after:duration-200
                                  peer-checked:after:translate-x-[14px]" />
                </div>
                <span className="text-sm text-ink-600 group-hover:text-ink-800 transition-colors">
                  排除停牌
                </span>
              </label>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-gold px-6 py-2.5 text-sm rounded-xl font-semibold ml-auto"
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              筛选中...
            </>
          ) : (
            <>
              <Search size={15} />
              开始筛选
            </>
          )}
        </button>
      </div>
    </form>
  );
});

export default FilterPanel;
export { DEFAULT_FILTERS };
