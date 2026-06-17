import { useState, useCallback } from 'react';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StrategySelector, { STRATEGIES } from '../components/StrategySelector';
import FilterPanel from '../components/FilterPanel';
import StockTable from '../components/StockTable';
import RiskPanel from '../components/RiskPanel';
import { screenStocks } from '../services/api';

const DEFAULT_SORT = {
  LOW_VALUATION: { key: 'peTtm', dir: 'asc' },
  HIGH_DIVIDEND: { key: 'dividendYield', dir: 'desc' },
  QUALITY_GROWTH: { key: 'roe', dir: 'desc' },
};

export default function StrategyPage() {
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState('LOW_VALUATION');
  const [results, setResults] = useState(null); // { items, total, page, pageSize }
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-cream-200 bg-white/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 text-ink-400 hover:text-ink-700 hover:bg-cream-100 rounded-lg transition-colors"
              title="返回首页"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-lg font-semibold text-ink-900">选股策略</h1>
            <span className="badge bg-cream-100 text-ink-500 text-xs">Beta</span>
          </div>
          <button
            onClick={() => navigate('/compare')}
            className="text-xs text-ink-500 hover:text-ink-700 transition-colors"
          >
            复利对比 →
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* ===== Zone 1: Top explanation ===== */}
          <section className="mb-8 animate-fade-in-up">
            <h2 className="text-2xl font-display font-bold text-ink-900 mb-2">
              A股新手选股策略
            </h2>
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-gold-500 shrink-0 mt-0.5" />
              <p className="text-sm text-ink-500 leading-relaxed max-w-2xl">
                本工具仅用于股票筛选与信息展示，不构成任何投资建议。请结合自身情况独立决策，投资有风险，入市需谨慎。
              </p>
            </div>
          </section>

          {/* ===== Zone 2: Strategy templates ===== */}
          <section className="mb-6 animate-fade-in-up delay-100">
            <h3 className="text-sm font-semibold text-ink-600 mb-3">选择策略模板</h3>
            <StrategySelector selected={selectedStrategy} onSelect={setSelectedStrategy} />
          </section>

          {/* ===== Zone 3: Filter conditions ===== */}
          <section className="mb-6 animate-fade-in-up delay-200">
            <FilterPanel
              strategyCode={selectedStrategy}
              onScreen={handleScreen}
              loading={loading}
            />
          </section>

          {/* Error state */}
          {error && (
            <section className="mb-6 animate-fade-in">
              <div className="card p-4 bg-red-50 border border-red-200 rounded-2xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </section>
          )}

          {/* ===== Zone 4: Results table ===== */}
          {results && (
            <section className="mb-8 animate-fade-in-up delay-300">
              <h3 className="text-sm font-semibold text-ink-600 mb-3">
                筛选结果
                {currentStrategy && (
                  <span className="font-normal text-ink-400 ml-1">
                    — {currentStrategy.name}策略
                  </span>
                )}
              </h3>
              <StockTable
                items={results.items || []}
                defaultSort={DEFAULT_SORT[selectedStrategy]}
              />
            </section>
          )}

          {/* Loading skeleton */}
          {loading && (
            <section className="mb-8 animate-fade-in">
              <div className="card p-8">
                <div className="space-y-3">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="h-8 bg-cream-100 rounded-lg animate-shimmer"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <p className="text-center text-xs text-ink-400 mt-4">正在筛选中...</p>
              </div>
            </section>
          )}

          {/* ===== Zone 5: Risk & explanations ===== */}
          <section className="animate-fade-in-up delay-400">
            <RiskPanel strategyCode={selectedStrategy} />
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-ink-400 border-t border-cream-200">
        选股策略 · 仅供筛选参考，不构成投资建议
      </footer>
    </div>
  );
}
