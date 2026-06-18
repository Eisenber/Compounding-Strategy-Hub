import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X, AlertTriangle } from 'lucide-react';

const POPOVER_WIDTH = 288;
const POPOVER_MARGIN = 8;

const ReasonTooltip = memo(function ReasonTooltip({ reason, riskTags = [] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, arrowLeft: 0 });
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);

  // ── Recalculate position on open / scroll / resize ──
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !popoverRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = popoverRef.current.offsetHeight;
    const viewportWidth = window.innerWidth;

    // Horizontal: center the popover relative to the trigger, clamp to viewport
    let left = triggerRect.left + triggerRect.width / 2 - POPOVER_WIDTH / 2;
    left = Math.max(8, Math.min(left, viewportWidth - POPOVER_WIDTH - 8));

    // Arrow position relative to the popover left edge
    const arrowLeft = triggerRect.left + triggerRect.width / 2 - left;

    // Vertical: above the trigger
    const top = triggerRect.top - popoverHeight - POPOVER_MARGIN;

    setPos({ top, left, arrowLeft });
  }, []);

  useEffect(() => {
    if (open) {
      // Delay to let the popover render & measure first
      requestAnimationFrame(updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Close on outside click
  const handleClickOutside = useCallback((e) => {
    if (
      popoverRef.current &&
      !popoverRef.current.contains(e.target) &&
      triggerRef.current &&
      !triggerRef.current.contains(e.target)
    ) {
      setOpen(false);
    }
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, handleClickOutside, handleKeyDown]);

  if (!reason && riskTags.length === 0) return null;

  const popover = open && (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: POPOVER_WIDTH,
        zIndex: 9999,
      }}
      className="animate-scale-in"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow */}
      <div
        style={{ left: `${pos.arrowLeft}px` }}
        className="absolute -bottom-1.5 -translate-x-1/2
                   w-3 h-3 bg-white border-b border-r border-cream-200
                   rotate-45 shadow-sm"
      />

      <div className="card shadow-card-elevated border border-cream-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-cream-50 border-b border-cream-100">
          <span className="text-xs font-semibold text-ink-700 flex items-center gap-1.5">
            <Lightbulb size={12} className="text-gold-500" />
            入选分析
          </span>
          <button
            onClick={() => setOpen(false)}
            className="p-0.5 rounded-md text-ink-300 hover:text-ink-600 hover:bg-cream-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3">
          {/* Reason */}
          {reason && (
            <div>
              <p className="text-2xs font-semibold text-ink-500 uppercase tracking-wide mb-1">
                入选原因
              </p>
              <p className="text-xs text-ink-700 leading-relaxed">{reason}</p>
            </div>
          )}

          {/* Risk tags */}
          {riskTags.length > 0 && (
            <div>
              <p className="text-2xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                <AlertTriangle size={10} className="inline mr-1 text-amber-500" />
                风险提示
              </p>
              <div className="flex flex-wrap gap-1.5">
                {riskTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md
                               text-2xs font-medium
                               bg-red-50 text-red-600 border border-red-150"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className={`
          inline-flex items-center gap-1 px-2.5 py-1 rounded-lg
          text-xs font-medium transition-all duration-200
          ${open
            ? 'bg-gold-100 text-gold-700 shadow-glow-sm'
            : 'bg-cream-100 text-ink-500 hover:bg-cream-200 hover:text-ink-700'
          }
        `}
        title="查看入选原因与风险提示"
      >
        <Lightbulb size={11} />
        详情
      </button>

      {/* Portal-rendered popover — bypasses all parent overflow clipping */}
      {createPortal(popover, document.body)}
    </>
  );
});

export default ReasonTooltip;
