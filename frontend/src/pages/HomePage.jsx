import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calculator, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: '多方案横向对比',
    desc: '同时对比 2~5 个投资方案，一目了然看到不同选择带来的长期差异。',
  },
  {
    icon: TrendingUp,
    title: '复利滚动计算',
    desc: '按月滚动计算，准确反映每月定投在复利作用下的真实增长轨迹。',
  },
  {
    icon: BarChart3,
    title: '可视化年度曲线',
    desc: '年度资产曲线图，直观展示资金随时间增长的完整过程。',
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-cream-200/50 to-transparent" />
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-gold-400/10 blur-2xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-ink-300/5 blur-2xl" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto">
          {/* Badge */}
          <div className="animate-fade-in-up inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-cream-300 text-ink-500 text-xs mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            长期投资测算工具
          </div>

          {/* Title */}
          <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-ink-900 tracking-tight leading-tight">
            看清复利的力量，
            <br />
            <span className="text-gold-600">做出更明智的选择</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-in-up delay-200 mt-6 text-lg text-ink-500 leading-relaxed max-w-lg mx-auto text-balance">
            输入你的投资方案，直观对比不同收益率、费用率和通胀假设下的长期结果。
            这不是投资建议，而是帮你理解复利的测算工具。
          </p>

          {/* CTA */}
          <div className="animate-fade-in-up delay-300 mt-10 flex items-center justify-center gap-3">
            <button
              onClick={() => navigate('/compare')}
              className="btn-gold px-8 py-4 text-base rounded-2xl shadow-lg shadow-gold-500/25 hover:shadow-xl hover:shadow-gold-500/30"
            >
              开始对比
              <span className="text-lg ml-1">→</span>
            </button>
            <button
              onClick={() => navigate('/strategy')}
              className="btn-secondary px-6 py-4 text-base rounded-2xl border-cream-300"
            >
              选股策略
              <span className="text-sm ml-1">Beta</span>
            </button>
          </div>

          {/* Disclaimer */}
          <p className="animate-fade-in delay-400 mt-6 text-xs text-ink-400">
            * 本工具仅为测算参考，不构成任何投资建议。投资有风险，决策需谨慎。
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="card p-6 text-center animate-fade-in-up"
                style={{ animationDelay: `${i * 100 + 400}ms` }}
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cream-100 text-gold-600 mb-4">
                  <f.icon size={22} />
                </div>
                <h3 className="font-semibold text-ink-800 mb-2">{f.title}</h3>
                <p className="text-sm text-ink-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-xs text-ink-400 border-t border-cream-200">
        复利方案对比 · 仅供测算参考，不构成投资建议
      </footer>
    </div>
  );
}
