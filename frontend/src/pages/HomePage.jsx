import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calculator, BarChart3, MessagesSquare } from 'lucide-react';

const features = [
  {
    icon: Calculator,
    title: '多方案横向对比',
    desc: '同时比较 2 到 5 个投资方案，快速看清不同收益率、费率和年限带来的长期差异。',
  },
  {
    icon: TrendingUp,
    title: '复利滚动计算',
    desc: '按月模拟定投和收益累积，更贴近长期投资里的真实复利轨迹。',
  },
  {
    icon: BarChart3,
    title: '可视化结果呈现',
    desc: '通过结果卡片和年度曲线，把资金增长过程讲得更直观。',
  },
  {
    icon: MessagesSquare,
    title: '知识库问答',
    desc: '围绕项目文档和实现说明做检索问答，适合快速查策略、查方案、查实现。',
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <section className="relative flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-cream-200/50 to-transparent" />
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-gold-400/10 blur-2xl" />
          <div className="absolute bottom-10 left-10 w-48 h-48 rounded-full bg-ink-300/5 blur-2xl" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="animate-fade-in-up inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-cream-300 text-ink-500 text-xs mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            长期投资辅助工具集
          </div>

          <h1 className="animate-fade-in-up delay-100 text-4xl sm:text-5xl lg:text-6xl font-display font-bold text-ink-900 tracking-tight leading-tight">
            看清复利，理解策略，
            <br />
            <span className="text-gold-600">把投资判断做得更从容</span>
          </h1>

          <p className="animate-fade-in-up delay-200 mt-6 text-lg text-ink-500 leading-relaxed max-w-2xl mx-auto text-balance">
            这里既能做复利测算，也能做基础选股策略筛选；现在还加入了 RAG
            知识库问答，方便直接追问项目文档、方案和实现细节。
          </p>

          <div className="animate-fade-in-up delay-300 mt-10 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => navigate('/compare')}
              className="btn-gold px-8 py-4 text-base rounded-2xl shadow-lg shadow-gold-500/25 hover:shadow-xl hover:shadow-gold-500/30"
            >
              复利对比
              <span className="text-lg ml-1">→</span>
            </button>
            <button
              onClick={() => navigate('/strategy')}
              className="btn-secondary px-6 py-4 text-base rounded-2xl border-cream-300"
            >
              选股策略
              <span className="text-sm ml-1">Beta</span>
            </button>
            <button
              onClick={() => navigate('/knowledge')}
              className="btn-secondary px-6 py-4 text-base rounded-2xl border-cream-300"
            >
              知识库问答
            </button>
          </div>

          <p className="animate-fade-in delay-400 mt-6 text-xs text-ink-400">
            * 本工具仅用于学习、测算和信息整理，不构成任何投资建议。投资有风险，决策需谨慎。
          </p>
        </div>
      </section>

      <section className="px-6 py-16 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
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

      <footer className="px-6 py-8 text-center text-xs text-ink-400 border-t border-cream-200">
        复利方案对比 · 选股策略 · 知识库问答
      </footer>
    </div>
  );
}
