import { memo, useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  SearchX,
} from 'lucide-react';
import ReasonTooltip from './ReasonTooltip';

// Color classification for financial values
const classifyValue = (key, val) => {
  if (val == null) return 'neutral';
  switch (key) {
    case 'peTtm':
    case 'pb':
      if (val <= 0) return 'negative';
      if (val <= 15) return 'positive';
      if (val <= 30) return 'neutral';
      return 'warning';
    case 'roe':
      if (val >= 15) return 'positive';
      if (val >= 8) return 'neutral';
      if (val <= 0) return 'negative';
      return 'warning';
    case 'revenueGrowth':
    case 'profitGrowth':
      if (val >= 20) return 'positive';
      if (val >= 0) return 'neutral';
      return 'negative';
    case 'dividendYield':
      if (val >= 4) return 'positive';
      if (val >= 2) return 'neutral';
      return 'warning';
    default:
      return 'neutral';
  }
};

const VALUE_COLORS = {
  positive: 'text-emerald-600',
  negative: 'text-red-500',
  neutral: 'text-ink-600',
  warning: 'text-amber-600',
};

const COLUMNS = [
  { key: 'symbol', label: '代码', sortable: false, minWidth: 'min-w-[5.5rem]' },
  { key: 'name', label: '名称', sortable: false, minWidth: 'min-w-[5rem]' },
  { key: 'industry', label: '行业', sortable: false, minWidth: 'min-w-[4.5rem]' },
  { key: 'price', label: '最新价', sortable: true, minWidth: 'min-w-[4.5rem]', format: (v) => v?.toFixed(2), align: 'right' },
  { key: 'peTtm', label: 'PE(TTM)', sortable: true, minWidth: 'min-w-[5rem]', format: (v) => (v != null ? v.toFixed(1) : '-'), align: 'right', colored: true },
  { key: 'pb', label: 'PB', sortable: true, minWidth: 'min-w-[4rem]', format: (v) => (v != null ? v.toFixed(2) : '-'), align: 'right', colored: true },
  { key: 'roe', label: 'ROE %', sortable: true, minWidth: 'min-w-[4.5rem]', format: (v) => (v != null ? v.toFixed(1) : '-'), align: 'right', colored: true },
  { key: 'revenueGrowth', label: '营收增长%', sortable: true, minWidth: 'min-w-[5.5rem]', format: (v) => (v != null ? v.toFixed(1) : '-'), align: 'right', colored: true },
  { key: 'profitGrowth', label: '利润增长%', sortable: true, minWidth: 'min-w-[5.5rem]', format: (v) => (v != null ? v.toFixed(1) : '-'), align: 'right', colored: true },
  { key: 'dividendYield', label: '股息率%', sortable: true, minWidth: 'min-w-[5rem]', format: (v) => (v != null ? v.toFixed(2) : '-'), align: 'right', colored: true },
  { key: 'marketCap', label: '市值(亿)', sortable: true, minWidth: 'min-w-[5rem]', format: (v) => (v != null ? v.toFixed(0) : '-'), align: 'right' },
  { key: 'action', label: '说明', sortable: false, minWidth: 'min-w-[5.5rem]', fixed: 'right' },
];

const PAGE_SIZE = 10;

// Sort indicator component
const SortIcon = ({ column, sortKey, sortDir }) => {
  if (!column.sortable) return null;
  if (sortKey !== column.key) {
    return <ArrowUpDown size={12} className="text-ink-300 group-hover:text-ink-500 transition-colors" />;
  }
  if (sortDir === 'asc') {
    return <ChevronUp size={14} className="text-gold-500" />;
  }
  return <ChevronDown size={14} className="text-gold-500" />;
};

const StockTable = memo(function StockTable({ items = [], defaultSort }) {
  const [sortKey, setSortKey] = useState(defaultSort?.key || null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir || 'asc');
  const [page, setPage] = useState(1);

  // Client-side sorting
  const sorted = useMemo(() => {
    if (!sortKey) return items;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      // nulls always last
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * dir;
    });
  }, [items, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  // Generate visible page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [safePage, totalPages]);

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cream-100 mb-5">
          <SearchX size={28} className="text-ink-300" />
        </div>
        <p className="text-ink-700 font-semibold text-sm mb-1.5">暂无筛选结果</p>
        <p className="text-ink-400 text-xs max-w-sm mx-auto leading-relaxed">
          当前筛选条件未能匹配到符合条件的股票，请尝试放宽筛选条件或更换策略模板
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Result count & sort info ── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gold-100 text-gold-700 font-semibold text-xs">
            <TrendingUp size={14} />
          </span>
          <p className="text-sm text-ink-600">
            共 <span className="font-bold text-ink-900 num">{items.length}</span>
            <span className="text-ink-400"> 只股票符合条件</span>
          </p>
        </div>
        {sortKey && (
          <span className="text-2xs text-ink-400 bg-cream-100 px-2.5 py-1 rounded-full">
            按 {COLUMNS.find((c) => c.key === sortKey)?.label} {sortDir === 'asc' ? '升序' : '降序'}排列
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* ── Header ── */}
            <thead>
              <tr className="bg-cream-50/80 border-b-2 border-cream-200">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`
                      group
                      ${col.minWidth}
                      px-4 py-3 text-left font-semibold text-ink-500 whitespace-nowrap
                      ${col.align === 'right' ? 'text-right' : 'text-left'}
                      ${col.sortable
                        ? 'cursor-pointer select-none hover:text-ink-800 hover:bg-cream-100/60 transition-colors'
                        : ''
                      }
                      ${col.fixed === 'right' ? 'sticky right-0 bg-cream-50 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]' : ''}
                    `}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      <SortIcon column={col} sortKey={sortKey} sortDir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Body ── */}
            <tbody className="divide-y divide-cream-100">
              {pageItems.map((stock, i) => (
                <tr
                  key={stock.symbol || i}
                  className={`
                    table-row-hover
                    ${i % 2 === 0 ? 'bg-white' : 'bg-cream-50/20'}
                  `}
                >
                  {COLUMNS.map((col) => {
                    // Action column
                    if (col.key === 'action') {
                      return (
                        <td
                          key={col.key}
                          className={`px-4 py-3 sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.06)]
                            ${i % 2 === 0 ? 'bg-white' : 'bg-cream-50/20'}`}
                        >
                          <ReasonTooltip reason={stock.reason} riskTags={stock.riskTags} />
                        </td>
                      );
                    }

                    const rawVal = stock[col.key];
                    const displayVal = col.format ? col.format(rawVal) : (rawVal ?? '-');
                    const colorClass = col.colored ? VALUE_COLORS[classifyValue(col.key, rawVal)] : '';

                    return (
                      <td
                        key={col.key}
                        className={`
                          px-4 py-3 whitespace-nowrap
                          ${col.align === 'right' ? 'text-right' : 'text-left'}
                          ${col.key === 'name' ? 'font-semibold text-ink-900' : ''}
                          ${col.key === 'symbol' ? 'num text-ink-500' : ''}
                          ${col.key === 'industry' ? 'text-ink-400' : ''}
                          ${col.colored ? `num ${colorClass}` : 'text-ink-600'}
                        `}
                      >
                        {col.key === 'peTtm' && rawVal != null && rawVal <= 0 && (
                          <span className="text-red-400 font-medium">亏损</span>
                        )}
                        {!(col.key === 'peTtm' && rawVal != null && rawVal <= 0) && displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <span className="text-xs text-ink-400">
            第 <span className="font-semibold text-ink-600">{safePage}</span> / {totalPages} 页
            <span className="mx-1.5 text-ink-300">·</span>
            共 {items.length} 条
          </span>

          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-500
                         rounded-lg border border-cream-200 bg-white
                         hover:bg-cream-50 hover:text-ink-700 hover:border-ink-300
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
            >
              <ChevronLeft size={14} />
              上一页
            </button>

            {/* Page numbers */}
            {pageNumbers[0] > 1 && (
              <>
                <button
                  onClick={() => setPage(1)}
                  className="w-8 h-8 text-xs font-medium text-ink-500 rounded-lg
                             hover:bg-cream-100 transition-colors"
                >
                  1
                </button>
                {pageNumbers[0] > 2 && (
                  <span className="text-ink-300 text-xs px-1">...</span>
                )}
              </>
            )}

            {pageNumbers.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`
                  w-8 h-8 text-xs font-semibold rounded-lg transition-all duration-200
                  ${p === safePage
                    ? 'bg-ink-900 text-white shadow-sm scale-105'
                    : 'text-ink-500 hover:bg-cream-100 hover:text-ink-700'
                  }
                `}
              >
                {p}
              </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-ink-300 text-xs px-1">...</span>
                )}
                <button
                  onClick={() => setPage(totalPages)}
                  className="w-8 h-8 text-xs font-medium text-ink-500 rounded-lg
                             hover:bg-cream-100 transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}

            {/* Next */}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-ink-500
                         rounded-lg border border-cream-200 bg-white
                         hover:bg-cream-50 hover:text-ink-700 hover:border-ink-300
                         disabled:opacity-30 disabled:cursor-not-allowed
                         transition-colors"
            >
              下一页
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default StockTable;
