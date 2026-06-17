import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Trash2,
  ArrowLeft,
  RotateCcw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import ScenarioForm from '../components/ScenarioForm';
import ResultCard from '../components/ResultCard';
import ComparisonChart from '../components/ComparisonChart';
import InsightsPanel from '../components/InsightsPanel';
import { compareScenarios } from '../services/api';

const DEFAULT_SCENARIOS = [
  {
    name: '银行定存',
    initialPrincipal: 50000,
    monthlyContribution: 2000,
    years: 10,
    annualReturnRate: 2,
    annualFeeRate: 0,
    inflationRate: 2.5,
  },
  {
    name: '纯债基金',
    initialPrincipal: 50000,
    monthlyContribution: 2000,
    years: 10,
    annualReturnRate: 4,
    annualFeeRate: 0.5,
    inflationRate: 2.5,
  },
  {
    name: '沪深300 ETF',
    initialPrincipal: 50000,
    monthlyContribution: 2000,
    years: 10,
    annualReturnRate: 8,
    annualFeeRate: 0.6,
    inflationRate: 2.5,
  },
];

const MAX_SCENARIOS = 5;
const MIN_SCENARIOS = 2;

function createEmptyScenario() {
  return {
    name: '',
    initialPrincipal: 50000,
    monthlyContribution: 2000,
    years: 10,
    annualReturnRate: 5,
    annualFeeRate: 0.5,
    inflationRate: 2.5,
  };
}

export default function ComparePage() {
  const [scenarios, setScenarios] = useState(() =>
    DEFAULT_SCENARIOS.map((s) => ({ ...s }))
  );
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateScenario = useCallback((index, field, value) => {
    setScenarios((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  }, []);

  const addScenario = useCallback(() => {
    setScenarios((prev) => {
      if (prev.length >= MAX_SCENARIOS) return prev;
      return [...prev, createEmptyScenario()];
    });
  }, []);

  const removeScenario = useCallback((index) => {
    setScenarios((prev) => {
      if (prev.length <= MIN_SCENARIOS) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const resetDefaults = useCallback(() => {
    setScenarios(DEFAULT_SCENARIOS.map((s) => ({ ...s })));
    setResults(null);
    setError(null);
  }, []);

  const handleCompare = useCallback(async () => {
    setError(null);
    setResults(null);

    // Validate
    for (let i = 0; i < scenarios.length; i++) {
      const s = scenarios[i];
      if (!s.name.trim()) {
        setError(`方案 ${i + 1} 的名称不能为空`);
        return;
      }
      if (s.initialPrincipal < 0) {
        setError(`方案「${s.name}」的初始本金不能为负数`);
        return;
      }
      if (s.monthlyContribution < 0) {
        setError(`方案「${s.name}」的每月定投金额不能为负数`);
        return;
      }
      if (s.years < 1 || s.years > 50) {
        setError(`方案「${s.name}」的投资年限需在 1~50 年之间`);
        return;
      }
      if (s.annualReturnRate < 0 || s.annualReturnRate > 100) {
        setError(`方案「${s.name}」的年化收益率需在 0~100% 之间`);
        return;
      }
      if (s.annualFeeRate < 0 || s.annualFeeRate > 10) {
        setError(`方案「${s.name}」的年费率需在 0~10% 之间`);
        return;
      }
      if (s.inflationRate < 0 || s.inflationRate > 20) {
        setError(`方案「${s.name}」的通胀率需在 0~20% 之间`);
        return;
      }
    }

    // Check for duplicate names
    const names = scenarios.map((s) => s.name.trim());
    if (new Set(names).size !== names.length) {
      setError('方案名称不能重复，请为每个方案使用不同的名称');
      return;
    }

    setLoading(true);
    try {
      const payload = scenarios.map((s) => ({
        name: s.name.trim(),
        initialPrincipal: Number(s.initialPrincipal),
        monthlyContribution: Number(s.monthlyContribution),
        years: Number(s.years),
        annualReturnRate: Number(s.annualReturnRate) / 100,
        annualFeeRate: Number(s.annualFeeRate) / 100,
        inflationRate: Number(s.inflationRate) / 100,
      }));

      const data = await compareScenarios(payload);
      setResults(data);
    } catch (err) {
      setError(err.message || '请求失败，请确认后端服务已启动');
    } finally {
      setLoading(false);
    }
  }, [scenarios]);

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-cream-200">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="btn-ghost px-3 py-1.5 text-sm rounded-lg -ml-3"
          >
            <ArrowLeft size={16} />
            返回首页
          </Link>
          <h1 className="text-sm font-semibold text-ink-700">复利方案对比</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8">
        {/* Top Notice */}
        <div className="mb-8 p-4 bg-ink-50 border border-ink-100 rounded-2xl text-xs text-ink-500 leading-relaxed">
          <strong className="text-ink-600">📌 温馨提示：</strong>
          本工具为长期复利测算工具，所有结果基于你输入的假设参数计算，仅供学习参考，不构成投资建议。投资有风险，过往业绩不代表未来表现。
        </div>

        {/* Scenario Inputs */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-ink-800">投资方案</h2>
            <div className="flex items-center gap-3">
              <button onClick={resetDefaults} className="btn-ghost text-xs px-3 py-1.5">
                <RotateCcw size={14} />
                恢复默认
              </button>
              <button
                onClick={addScenario}
                disabled={scenarios.length >= MAX_SCENARIOS}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                <Plus size={14} />
                新增方案
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {scenarios.map((s, i) => (
              <ScenarioForm
                key={i}
                index={i}
                scenario={s}
                onChange={(field, value) => updateScenario(i, field, value)}
                onRemove={() => removeScenario(i)}
                canRemove={scenarios.length > MIN_SCENARIOS}
                isBest={
                  results != null &&
                  s.name.trim() === results.bestScenarioName
                }
              />
            ))}
          </div>
        </section>

        {/* Compare Button */}
        <section className="mb-10 text-center">
          <button
            onClick={handleCompare}
            disabled={loading || scenarios.length < MIN_SCENARIOS}
            className="btn-gold px-10 py-3.5 text-base rounded-2xl shadow-lg shadow-gold-500/25 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                计算中...
              </>
            ) : (
              <>
                开始对比
                <span className="ml-1">→</span>
              </>
            )}
          </button>
          {scenarios.length < MIN_SCENARIOS && (
            <p className="mt-2 text-xs text-ink-400">
              至少需要 {MIN_SCENARIOS} 个方案才能对比
            </p>
          )}
        </section>

        {/* Error */}
        {error && (
          <section className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </section>
        )}

        {/* Results */}
        {results && (
          <section className="space-y-8 animate-fade-in-up">
            {/* Result Cards */}
            <div>
              <h2 className="text-lg font-semibold text-ink-800 mb-5">对比结果</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {results.scenarios.map((s, i) => (
                  <ResultCard
                    key={s.name}
                    scenario={s}
                    rank={i + 1}
                    isBest={s.name === results.bestScenarioName}
                  />
                ))}
              </div>
            </div>

            {/* Chart */}
            <ComparisonChart scenarios={results.scenarios} />

            {/* Insights */}
            <InsightsPanel
              insights={results.insights}
              bestName={results.bestScenarioName}
            />
          </section>
        )}

        {/* Empty state after first view */}
        {!results && !loading && !error && (
          <section className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cream-200 text-ink-400 mb-4">
              <BarChartIcon />
            </div>
            <p className="text-ink-500 text-sm">
              配置好方案后，点击「开始对比」查看结果
            </p>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-ink-400 border-t border-cream-200">
        复利方案对比 · 仅供测算参考，不构成投资建议
      </footer>
    </div>
  );
}

/** Simple bar chart icon for empty state */
function BarChartIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    >
      <rect x="3" y="14" width="4" height="6" rx="1" />
      <rect x="10" y="8" width="4" height="12" rx="1" />
      <rect x="17" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}
