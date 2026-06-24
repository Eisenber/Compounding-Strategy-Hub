import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Database } from 'lucide-react';
import { getDataStatus, triggerDataRefresh } from '../services/api';

/**
 * Format staleMinutes into a human-readable string.
 */
function formatStale(minutes) {
  if (minutes == null || minutes < 0) return '';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  return `${days} 天前`;
}

/**
 * Format stockCount with thousand separators.
 */
function formatCount(n) {
  if (!n) return '0';
  return n.toLocaleString('zh-CN');
}

export default function DataFreshnessIndicator() {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await getDataStatus();
      setStatus(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err.message || '无法获取数据状态');
      return null;
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchStatus();

    // Normal polling every 60s
    pollRef.current = setInterval(fetchStatus, 60_000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  // Fast poll while refreshing
  useEffect(() => {
    if (refreshing || (status && status.isRefreshing)) {
      const fastPoll = setInterval(async () => {
        const data = await fetchStatus();
        if (data && !data.isRefreshing) {
          setRefreshing(false);
          if (fastPoll) clearInterval(fastPoll);
        }
      }, 3_000);
      return () => clearInterval(fastPoll);
    }
  }, [refreshing, status && status.isRefreshing]);

  const handleRefresh = async () => {
    if (refreshing || (status && status.isRefreshing)) return;
    setRefreshing(true);
    try {
      await triggerDataRefresh();
      // Fast poll will track completion
    } catch (err) {
      setRefreshing(false);
      setError(err.message || '触发刷新失败');
    }
  };

  // ── Render helpers ──

  const isLoading = !status && !error;
  const isRefreshing = refreshing || (status && status.isRefreshing);
  const hasError = error && !status;
  const isStale =
    status &&
    (status.lastStatus === 'FAILED' ||
      status.lastStatus === 'NO_DATA' ||
      status.staleMinutes > 48 * 60); // >2 days
  const isWarn =
    status &&
    !isStale &&
    !isRefreshing &&
    status.staleMinutes > 24 * 60; // 1-2 days
  const isFresh = status && !isStale && !isWarn && !isRefreshing;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Left: status indicator */}
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-ink-50 shrink-0">
            <Database size={15} className="text-ink-500" />
          </span>

          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-cream-300 animate-pulse" />
              <span className="text-sm text-ink-400">加载数据状态...</span>
            </div>
          )}

          {hasError && (
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-400 shrink-0" />
              <span className="text-sm text-red-600">{error}</span>
              <button
                onClick={fetchStatus}
                className="text-xs text-ink-500 hover:text-ink-700 underline"
              >
                重试
              </button>
            </div>
          )}

          {isRefreshing && (
            <div className="flex items-center gap-2">
              <RefreshCw size={14} className="text-gold-500 animate-spin shrink-0" />
              <span className="text-sm text-gold-600 font-medium">数据更新中...</span>
            </div>
          )}

          {isFresh && (
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              <span className="text-sm text-ink-700 truncate">
                数据更新于{' '}
                <span className="font-semibold text-ink-900">
                  {status.lastUpdated || '未知'}
                </span>
                {status.staleMinutes >= 0 && (
                  <span className="text-ink-400 ml-1">({formatStale(status.staleMinutes)})</span>
                )}
              </span>
            </div>
          )}

          {isWarn && (
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              <span className="text-sm text-ink-700 truncate">
                数据更新于{' '}
                <span className="font-semibold text-ink-900">
                  {status.lastUpdated || '未知'}
                </span>
                <span className="text-amber-600 ml-1">({formatStale(status.staleMinutes)})</span>
              </span>
            </div>
          )}

          {isStale && status.lastStatus === 'FAILED' && (
            <div className="flex items-center gap-2 min-w-0">
              <XCircle size={14} className="text-red-500 shrink-0" />
              <span className="text-sm text-red-600 font-medium">
                上次更新失败
                {status.lastError && (
                  <span className="text-red-400 ml-1 truncate" title={status.lastError}>
                    — {status.lastError.length > 30
                      ? status.lastError.slice(0, 30) + '...'
                      : status.lastError}
                  </span>
                )}
              </span>
            </div>
          )}

          {isStale && status.lastStatus === 'NO_DATA' && (
            <div className="flex items-center gap-2">
              <XCircle size={14} className="text-red-500 shrink-0" />
              <span className="text-sm text-red-600 font-medium">暂无数据</span>
            </div>
          )}

          {isStale &&
            status.lastStatus === 'SUCCESS' &&
            status.staleMinutes > 48 * 60 && (
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle size={14} className="text-red-500 shrink-0" />
                <span className="text-sm text-red-600 truncate">
                  数据已过期 ({formatStale(status.staleMinutes)}), 上次更新于{' '}
                  <span className="font-semibold">{status.lastUpdated}</span>
                </span>
              </div>
            )}

          {/* Stock count */}
          {status && status.stockCount > 0 && (
            <span className="text-xs text-ink-400 ml-2 shrink-0">
              共 {formatCount(status.stockCount)} 只股票
            </span>
          )}
        </div>

        {/* Right: refresh button */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                     text-ink-500 hover:text-ink-700 hover:bg-cream-100 rounded-lg
                     transition-colors shrink-0"
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? '更新中...' : '刷新数据'}
        </button>
      </div>
    </div>
  );
}
