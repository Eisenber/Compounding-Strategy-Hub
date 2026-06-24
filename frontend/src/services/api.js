const API_BASE = '/api';

/**
 * Health check — verify backend connectivity.
 * @returns {Promise<{status: string}>}
 */
export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) {
    throw new Error(`健康检查失败 (${res.status})`);
  }
  return res.json();
}

/**
 * Compare multiple compound-investment scenarios.
 *
 * @param {Array<{
 *   name: string,
 *   initialPrincipal: number,
 *   monthlyContribution: number,
 *   years: number,
 *   annualReturnRate: number,
 *   annualFeeRate: number,
 *   inflationRate: number
 * }>} scenarios — 2 to 5 scenarios
 *
 * @returns {Promise<{
 *   bestScenarioName: string,
 *   scenarios: Array<{
 *     name: string,
 *     totalInvested: number,
 *     finalAmount: number,
 *     totalProfit: number,
 *     profitMultiple: number,
 *     realFinalAmount: number,
 *     yearlyPoints: Array<{year: number, amount: number}>
 *   }>,
 *   insights: string[]
 * }>}
 */
export async function compareScenarios(scenarios) {
  const res = await fetch(`${API_BASE}/v1/compound/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenarios }),
  });

  if (!res.ok) {
    const body = await res.text();
    let msg = `请求失败 (${res.status})`;
    try {
      const err = JSON.parse(body);
      if (Array.isArray(err.messages) && err.messages.length > 0) {
        msg = err.messages[0];
      } else if (err.message) {
        msg = err.message;
      }
    } catch {
      // use default msg
    }
    throw new Error(msg);
  }

  return res.json();
}

// ==================== V2 策略筛选接口 ====================

/**
 * Fetch list of all strategy templates.
 * @returns {Promise<Array<{code: string, name: string, description: string}>>}
 */
export async function getStrategyTemplates() {
  const res = await fetch(`${API_BASE}/v2/strategies/templates`);
  if (!res.ok) {
    throw new Error(`获取策略模板失败 (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch default filter settings for a specific strategy template.
 * @param {string} code — strategy code, e.g. "LOW_VALUATION"
 * @returns {Promise<{code: string, name: string, filters: object}>}
 */
export async function getTemplateDetail(code) {
  const res = await fetch(`${API_BASE}/v2/strategies/templates/${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error(`获取模板详情失败 (${res.status})`);
  }
  return res.json();
}

/**
 * Run a stock screening with the given strategy and filter parameters.
 * @param {{
 *   strategyCode: string,
 *   filters: object,
 *   sortBy?: string,
 *   sortDirection?: 'asc'|'desc',
 *   page?: number,
 *   pageSize?: number
 * }} params
 * @returns {Promise<{total: number, page: number, pageSize: number, items: Array}>}
 */
export async function screenStocks(params) {
  const res = await fetch(`${API_BASE}/v2/strategies/screen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.text();
    let msg = `筛选请求失败 (${res.status})`;
    try {
      const err = JSON.parse(body);
      if (Array.isArray(err.messages) && err.messages.length > 0) {
        msg = err.messages[0];
      } else if (err.message) {
        msg = err.message;
      }
    } catch {
      // use default msg
    }
    throw new Error(msg);
  }

  return res.json();
}

export async function askKnowledgeBase(params) {
  const res = await fetch(`${API_BASE}/v1/knowledge/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const body = await res.text();
    let msg = `知识库问答请求失败 (${res.status})`;
    try {
      const err = JSON.parse(body);
      if (Array.isArray(err.messages) && err.messages.length > 0) {
        msg = err.messages[0];
      } else if (err.message) {
        msg = err.message;
      } else if (err.error) {
        msg = err.error;
      }
    } catch {
      // use default msg
    }
    throw new Error(msg);
  }

  return res.json();
}

export async function reindexKnowledgeBase() {
  const res = await fetch(`${API_BASE}/v1/knowledge/reindex`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`知识库重建索引失败 (${res.status})`);
  }
  return res.json();
}

// ==================== V2 数据状态接口 ====================

/**
 * Fetch data freshness status.
 * @returns {Promise<{
 *   lastUpdated: string|null,
 *   stockCount: number,
 *   lastStatus: string,
 *   lastError: string|null,
 *   staleMinutes: number,
 *   isRefreshing: boolean
 * }>}
 */
export async function getDataStatus() {
  const res = await fetch(`${API_BASE}/v2/strategies/data-status`);
  if (!res.ok) {
    throw new Error(`获取数据状态失败 (${res.status})`);
  }
  return res.json();
}

/**
 * Manually trigger a data refresh.
 * @returns {Promise<{message: string, isRefreshing: boolean}>}
 */
export async function triggerDataRefresh() {
  const res = await fetch(`${API_BASE}/v2/strategies/refresh`, {
    method: 'POST',
  });
  if (!res.ok) {
    const body = await res.text();
    let msg = `触发更新失败 (${res.status})`;
    try {
      const err = JSON.parse(body);
      msg = err.error || err.message || msg;
    } catch {
      // use default msg
    }
    throw new Error(msg);
  }
  return res.json();
}
