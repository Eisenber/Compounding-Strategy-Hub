import { useState, useCallback } from 'react';
import { ArrowLeft, AlertTriangle, BarChart3, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StrategySelector, { STRATEGIES } from '../components/StrategySelector';
import FilterPanel from '../components/FilterPanel';
import StockTable from '../components/StockTable';
import RiskPanel from '../components/RiskPanel';
import DataFreshnessIndicator from '../components/DataFreshnessIndicator';
import { screenStocks } from '../services/api';

const DEFAULT_SORT = {
  LOW_VALUATION: { key: 'peTtm', dir: 'asc' },
  HIGH_DIVIDEND: { key: 'dividendYield', dir: 'desc' },
  QUALITY_GROWTH: { key: 'roe', dir: 'desc' },
};

export default function StrategyPage() {
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState('LOW_VALUATION');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentStrategy = STRATEGIES.find((s) => s.code === selectedStrategy);

  const handleScreen = useCallback(
    async (filters) => {
      setLoading(true);
      setError(null);
      try {
        const defaultSort = DEFAULT_SORT[selectedStrategy];
        const data = await screenStocks({
          strategyCode: selectedStrategy,
          filters,
          sortBy: defaultSort.key,
          sortDirection: defaultSort.dir,
          page: 1,
          pageSize: 50,
        });
        setResults(data);
      } catch (err) {
        setError(err.message || '筛选请求失败，请稍后重试');
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [selectedStrategy]
  );

  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      {/* ── Header ── */}
      <header className="glass sticky top-0 z-30 border-b border-cream-200/60">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-cream-100 rounded-lg transition-colors"
              title="返回首页"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-cream-300" />
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-gold-500" />
              <h1 className="text-base font-bold text-ink-900">选股策略</h1>
            </div>
            <span className="badge bg-cream-100 text-ink-400 text-2xs border border-cream-200">
              Beta
            </span>
          </div>
          <button
            onClick={() => navigate('/compare')}
            className="btn-ghost text-xs px-3 py-1.5"
          >
            复利对比 →
          </button>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* ═══ Zone 1: Page title & disclaimer ═══ */}
          <section className="mb-8 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-ink-900 mb-2 tracking-tight">
              A股新手选股策略
            </h2>
            <div className="flex items-start gap-2 max-w-2xl">
              <AlertTriangle size={14} className="text-gold-500 shrink-0 mt-0.5" />
              <p className="text-sm text-ink-400 leading-relaxed">
                本工具仅用于股票筛选与信息展示，不构成任何投资建议。请结合自身情况独立决策，投资有风险，入市需谨慎。
              </p>
            </div>
          </section>

          {/* ═══ Zone 1.5: Data freshness indicator ═══ */}
          <section className="mb-6 animate-fade-in-up delay-150">
            <DataFreshnessIndicator />
          </section>

          {/* ═══ Zone 2: Strategy templates ═══ */}
          <section className="mb-6 animate-fade-in-up delay-100">
            <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
              选择策略模板
            </h3>
            <StrategySelector selected={selectedStrategy} onSelect={setSelectedStrategy} />
          </section>

          {/* ═══ Zone 3: Filter conditions ═══ */}
          <section className="mb-8 animate-fade-in-up delay-200">
            <FilterPanel
              strategyCode={selectedStrategy}
              onScreen={handleScreen}
              loading={loading}
            />
          </section>

          {/* ═══ Error state ═══ */}
          {error && (
            <section className="mb-8 animate-fade-in">
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-red-100 shrink-0">
                  <AlertTriangle size={15} className="text-red-500" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-0.5">筛选失败</p>
                  <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                </div>
              </div>
            </section>
          )}

          {/* ═══ Zone 4: Loading skeleton ═══ */}
          {loading && (
            <section className="mb-8 animate-fade-in">
              <div className="card p-6">
                {/* Skeleton header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-cream-200 animate-shimmer" />
                  <div className="w-48 h-4 rounded-md bg-cream-200 animate-shimmer" />
                </div>
                {/* Skeleton table header */}
                <div className="grid grid-cols-12 gap-2 mb-3">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-md bg-cream-200 animate-shimmer col-span-1"
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>
                {/* Skeleton rows */}
                <div className="space-y-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      {Array.from({ length: 12 }, (_, j) => (
                        <div
                          key={j}
                          className="h-4 rounded-md bg-cream-100 animate-shimmer col-span-1"
                          style={{ animationDelay: `${i * 100 + j * 30}ms` }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center mt-5">
                  <Loader2 size={16} className="text-gold-500 animate-spin mr-2" />
                  <span className="text-xs text-ink-400">正在筛选中...</span>
                </div>
              </div>
            </section>
          )}

          {/* ═══ Zone 5: Results table ═══ */}
          {results && !loading && (
            <section className="mb-8 animate-fade-in-up">
              <StockTable
                items={results.items || []}
                defaultSort={DEFAULT_SORT[selectedStrategy]}
              />
            </section>
          )}

          {/* ═══ Zone 6: Risk & explanations ═══ */}
          <section className="animate-fade-in-up delay-300">
            <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-4">
              风险提示与指标解释
            </h3>
            <RiskPanel strategyCode={selectedStrategy} />
          </section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="px-6 py-5 text-center text-xs text-ink-300 border-t border-cream-200">
        选股策略 · 仅供筛选参考，不构成投资建议
      </footer>
    </div>
  );
}
