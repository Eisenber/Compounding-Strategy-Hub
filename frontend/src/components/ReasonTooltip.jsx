import { memo, useState } from 'react';
import { Lightbulb } from 'lucide-react';

const ReasonTooltip = memo(function ReasonTooltip({ reason, riskTags = [] }) {
  const [open, setOpen] = useState(false);

  if (!reason && riskTags.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium transition-colors ${
          open
            ? 'bg-gold-100 text-gold-700'
            : 'bg-cream-100 text-ink-500 hover:bg-cream-200 hover:text-ink-700'
        }`}
        title="查看入选原因与风险"
      >
        <Lightbulb size={12} />
        入选原因
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />

          {/* Popover */}
          <div className="absolute bottom-full left-0 mb-2 z-20 w-64 card p-4 shadow-lg border border-cream-200">
            {/* Reason */}
            {reason && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-ink-700 mb-1">入选原因</p>
                <p className="text-xs text-ink-600 leading-relaxed">{reason}</p>
              </div>
            )}

            {/* Risk tags */}
            {riskTags.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-700 mb-1.5">风险提示</p>
                <div className="flex flex-wrap gap-1.5">
                  {riskTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-600 border border-red-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default ReasonTooltip;
