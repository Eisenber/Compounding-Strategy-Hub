import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Loader2, RefreshCcw, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { askKnowledgeBase, reindexKnowledgeBase } from '../services/api';

const SUGGESTED_QUESTIONS = [
  '这个项目目前支持哪些选股策略？',
  '真实股票数据接入是怎么设计和落地的？',
  '如果要继续扩展这个项目，应该先看哪些文档？',
];

export default function KnowledgePage() {
  const navigate = useNavigate();
  const [question, setQuestion] = useState(SUGGESTED_QUESTIONS[0]);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [useGeneration, setUseGeneration] = useState(true);
  const [meta, setMeta] = useState(null);

  const sourceCountLabel = useMemo(() => {
    if (!meta) return '等待首次提问';
    return `已索引 ${meta.indexedDocumentCount} 份文档 / ${meta.indexedChunkCount} 个片段`;
  }, [meta]);

  const answerModeSummary = useMemo(() => {
    if (!answer) return null;

    if (answer.mode === 'rag') {
      return {
        title: '当前模式：生成式回答',
        description: '本次回答由模型基于检索到的上下文生成，不是检索回退结果。',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      };
    }

    if (useGeneration && answer.generationAvailable) {
      return {
        title: '当前模式：检索回退',
        description: '生成能力已配置，但这次回答回退成了仅检索输出。通常表示模型调用没有返回可用内容。',
        className: 'border-amber-200 bg-amber-50 text-amber-900',
      };
    }

    if (useGeneration && !answer.generationAvailable) {
      return {
        title: '当前模式：仅检索',
        description: '你请求了生成式回答，但后端当前还没有配置模型生成能力。',
        className: 'border-ink-200 bg-white text-ink-700',
      };
    }

    return {
      title: '当前模式：仅检索',
      description: '这次回答是主动使用仅检索输出，因为你已经关闭了生成式回答。',
      className: 'border-ink-200 bg-white text-ink-700',
    };
  }, [answer, useGeneration]);

  async function handleAsk(event) {
    event?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setError('请先输入问题。');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await askKnowledgeBase({
        question: trimmed,
        topK: 5,
        useGeneration,
      });
      setAnswer(data);
      setMeta(data);
    } catch (err) {
      setError(err.message || '知识库问答失败。');
    } finally {
      setLoading(false);
    }
  }

  async function handleReindex() {
    setReindexing(true);
    setError(null);
    try {
      const data = await reindexKnowledgeBase();
      setMeta(data);
    } catch (err) {
      setError(err.message || '重建索引失败。');
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900">
      <header className="glass sticky top-0 z-30 border-b border-cream-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 text-ink-400 hover:text-ink-700 hover:bg-cream-100 rounded-xl transition-colors"
              title="返回首页"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-5 w-px bg-cream-300" />
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-gold-600" />
              <div>
                <h1 className="text-base font-bold">RAG 知识库问答</h1>
                <p className="text-xs text-ink-400">{sourceCountLabel}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleReindex}
            disabled={reindexing}
            className="btn-secondary px-4 py-2 text-sm"
          >
            {reindexing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCcw size={15} />}
            重建索引
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <section className="relative overflow-hidden rounded-[28px] border border-cream-200 bg-white shadow-card-elevated mb-8">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-12 right-0 h-56 w-56 rounded-full bg-gold-200/35 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-ink-100/60 blur-3xl" />
          </div>

          <div className="relative px-8 py-10 md:px-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold-50 px-3 py-1 text-xs font-semibold text-gold-700 border border-gold-100">
              <Sparkles size={14} />
              文档检索 + 可选生成
            </div>
            <h2 className="mt-5 text-3xl md:text-4xl font-display font-bold tracking-tight max-w-3xl">
              直接向项目提问，让文档带着证据来回答
            </h2>
            <p className="mt-4 max-w-3xl text-sm md:text-base text-ink-500 leading-relaxed">
              知识库会索引本地文档、规划说明和 README 文件。配置好模型后，这里会自动升级成完整
              RAG 回答；如果模型不可用，也仍然可以先用检索模式回答。
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto">
          <section className="card-elevated p-6 md:p-7">
            <form onSubmit={handleAsk}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold">提问</h3>
                  <p className="text-sm text-ink-400 mt-1">
                    适合查询策略规则、实现方案、文档位置和后续扩展思路。
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-ink-500 select-none">
                  <input
                    type="checkbox"
                    checked={useGeneration}
                    onChange={(e) => setUseGeneration(e.target.checked)}
                    className="rounded border-cream-300 text-gold-600 focus:ring-gold-500"
                  />
                  使用生成式回答
                </label>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {SUGGESTED_QUESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuestion(item)}
                    className="rounded-full border border-cream-200 bg-cream-50 px-4 py-1.5 text-xs text-ink-500 hover:border-gold-300 hover:bg-gold-50/50 transition-colors"
                  >
                    {item}
                  </button>
                ))}
              </div>

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="input-field min-h-[180px] resize-y leading-relaxed"
                placeholder="例如：这个项目的真实股票数据链路是怎么工作的？"
              />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold px-6 py-3 rounded-2xl shadow-glow-sm"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  开始问答
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAnswer(null);
                    setError(null);
                    setQuestion('');
                  }}
                  className="btn-secondary px-5 py-3 rounded-2xl"
                >
                  清空
                </button>
              </div>
            </form>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {answer && (
              <div className="mt-6 rounded-[24px] border border-cream-200 bg-cream-50/70 p-5">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="badge bg-white text-ink-500 border border-cream-200">
                    模式：{answer.mode === 'rag' ? '生成式回答' : '仅检索'}
                  </span>
                  <span className="badge bg-white text-ink-500 border border-cream-200">
                    生成能力：{answer.generationAvailable ? '已启用' : '未配置'}
                  </span>
                </div>
                {answerModeSummary && (
                  <div className={`mb-4 rounded-2xl border px-4 py-3 ${answerModeSummary.className}`}>
                    <p className="text-sm font-semibold">{answerModeSummary.title}</p>
                    <p className="mt-1 text-sm leading-6">{answerModeSummary.description}</p>
                  </div>
                )}
                <h4 className="font-semibold text-ink-800 mb-3">回答</h4>
                <div className="text-sm leading-7 text-ink-700 whitespace-pre-wrap">
                  {answer.answer}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
