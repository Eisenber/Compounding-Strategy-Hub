import { memo, useState, useMemo } from 'react';
import { ArrowUpDown, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import ReasonTooltip from './ReasonTooltip';

const COLUMNS = [
  { key: 'symbol', label: '代码', sortable: false, width: 'w-20' },
  { key: 'name', label: '名称', sortable: false, width: 'w-20' },
  { key: 'industry', label: '行业', sortable: false, width: 'w-16' },
  { key: 'price', label: '最新价', sortable: true, width: 'w-16', format: (v) => v?.toFixed(2) },
  { key: 'peTtm', label: 'PE', sortable: true, width: 'w-14', format: (v) => v?.toFixed(1) },
  { key: 'pb', label: 'PB', sortable: true, width: 'w-14', format: (v) => v?.toFixed(2) },
  { key: 'roe', label: 'ROE %', sortable: true, width: 'w-16', format: (v) => v?.toFixed(1) },
  { key: 'revenueGrowth', label: '营收增长%', sortable: true, width: 'w-18', format: (v) => v?.toFixed(1) },
  { key: 'profitGrowth', label: '利润增长%', sortable: true, width: 'w-18', format: (v) => v?.toFixed(1) },
  { key: 'dividendYield', label: '股息率%', sortable: true, width: 'w-16', format: (v) => v?.toFixed(2) },
  { key: 'marketCap', label: '市值(亿)', sortable: true, width: 'w-18', format: (v) => v?.toFixed(0) },
  { key: 'action', label: '说明', sortable: false, width: 'w-20' },
];

const PAGE_SIZE = 10;

const StockTable = memo(function StockTable({ items = [], defaultSort, onSort }) {
  const [sortKey, setSortKey] = useState(defaultSort?.key || null);
  const [sortDir, setSortDir] = useState(defaultSort?.dir || 'asc');
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    if (!sortKey) return items;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      return (va - vb) * dir;
    });
  }, [items, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  if (items.length === 0) {
    return (
      <div className="card p-8 text-center">
        <HelpCircle size={32} className="text-ink-300 mx-auto mb-3" />
        <p className="text-ink-500 text-sm mb-1">暂无筛选结果</p>
        <p className="text-ink-400 text-xs">
          请先选择策略模板并点击"开始筛选"，或适当放宽筛选条件。
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Result count */}
      <p className="text-xs text-ink-500 mb-3">
        共 <span className="font-semibold text-ink-700 num">{items.length}</span> 只股票符合条件
      </p>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-cream-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-cream-50 border-b border-cream-200">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`${col.width} px-3 py-2.5 text-left font-medium text-ink-600 whitespace-nowrap ${
                    col.sortable ? 'cursor-pointer select-none hover:text-ink-900' : ''
                  }`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <ArrowUpDown size={11} className="text-ink-400" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((stock, i) => (
              <tr
                key={stock.symbol || i}
                className={`border-b border-cream-100 last:border-b-0 hover:bg-cream-50/50 transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-cream-50/30'
                }`}
              >
                {COLUMNS.map((col) => {
                  if (col.key === 'action') {
                    return (
                      <td key={col.key} className="px-3 py-2.5">
                        <ReasonTooltip reason={stock.reason} riskTags={stock.riskTags} />
                      </td>
                    );
                  }
                  const val = col.format ? col.format(stock[col.key]) : stock[col.key];
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 text-ink-700 whitespace-nowrap ${
                        col.key === 'name' ? 'font-medium' : ''
                      } ${col.key === 'symbol' ? 'num' : ''}`}
                    >
                      {val ?? '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="text-ink-500">
            第 {safePage} / {totalPages} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  p === safePage
                    ? 'bg-gold-500 text-white'
                    : 'text-ink-600 hover:bg-cream-100'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary px-3 py-1.5 text-xs rounded-lg"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default StockTable;
