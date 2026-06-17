package com.example.compound.service.v2;

import com.example.compound.data.v2.MockStockDataProvider;
import com.example.compound.dto.v2.ScreenRequestDto;
import com.example.compound.dto.v2.ScreenResponseDto;
import com.example.compound.dto.v2.StockItemDto;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 股票筛选服务 — 负责按策略模板条件筛选、排序、分页，并生成入选原因和风险标签。
 * <p>
 * MVP 阶段基于 MockStockDataProvider 的本地数据运行，不接外部数据源。
 */
public class StockScreeningService {

    private final StrategyTemplateService templateService;

    public StockScreeningService(StrategyTemplateService templateService) {
        this.templateService = templateService;
    }

    /**
     * 执行策略筛选
     */
    public ScreenResponseDto screen(ScreenRequestDto request) {
        String strategyCode = request.getStrategyCode();
        Map<String, Object> filters = request.getFilters();

        // 如果前端未传筛选条件，使用模板默认值
        if (filters == null || filters.isEmpty()) {
            filters = templateService.getDefaultFilters(strategyCode);
        }

        // 1. 从mock数据源获取全量股票
        List<StockItemDto> allStocks = MockStockDataProvider.getAllStocks();

        // 2. 应用筛选条件（交集）
        List<StockItemDto> filtered = applyFilters(allStocks, strategyCode, filters);

        // 3. 为每只股票生成入选原因和风险标签
        for (StockItemDto stock : filtered) {
            stock.setReason(generateReason(strategyCode, stock, filters));
            stock.setRiskTags(generateRiskTags(strategyCode, stock));
        }

        // 4. 排序
        String sortBy = request.getSortBy();
        String sortDirection = request.getSortDirection();
        if (sortBy == null || sortBy.isBlank()) {
            sortBy = getDefaultSortField(strategyCode);
            sortDirection = getDefaultSortDirection(strategyCode);
        }
        if (sortDirection == null || sortDirection.isBlank()) {
            sortDirection = "asc";
        }
        sortStocks(filtered, sortBy, sortDirection);

        // 5. 分页
        int total = filtered.size();
        int page = Math.max(1, request.getPage());
        int pageSize = Math.min(Math.max(1, request.getPageSize()), 50);
        int fromIndex = Math.min((page - 1) * pageSize, total);
        int toIndex = Math.min(fromIndex + pageSize, total);
        List<StockItemDto> pageItems = (fromIndex < total)
                ? filtered.subList(fromIndex, toIndex)
                : List.of();

        // 6. 构造响应
        ScreenResponseDto response = new ScreenResponseDto();
        response.setTotal(total);
        response.setPage(page);
        response.setPageSize(pageSize);
        response.setItems(pageItems);
        return response;
    }

    // ---------- 筛选逻辑 ----------

    private List<StockItemDto> applyFilters(List<StockItemDto> stocks, String strategyCode,
                                            Map<String, Object> filters) {
        return stocks.stream()
                .filter(s -> !isExcludedByCommonRules(s, filters))
                .filter(s -> passesStrategyFilters(s, strategyCode, filters))
                .collect(Collectors.toList());
    }

    /** 通用排除规则：ST、停牌、次新股 */
    private boolean isExcludedByCommonRules(StockItemDto s, Map<String, Object> filters) {
        // 排除 ST
        if (getBoolean(filters, "excludeSt") && s.getName() != null && s.getName().contains("ST")) {
            return true;
        }
        // 排除停牌（价格<=0 或 PE为负且营收极度萎缩视为停牌信号）
        if (getBoolean(filters, "excludeSuspended") && s.getPrice() <= 0) {
            return true;
        }
        // 排除上市未满180天（用代码 688xxx 标识次新股）
        if (filters.containsKey("minListingDays") && s.getSymbol().startsWith("688")) {
            return true;
        }
        return false;
    }

    /** 策略专属筛选条件 */
    private boolean passesStrategyFilters(StockItemDto s, String strategyCode,
                                          Map<String, Object> filters) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> passesLowValuation(s, filters);
            case StrategyTemplateService.HIGH_DIVIDEND -> passesHighDividend(s, filters);
            case StrategyTemplateService.QUALITY_GROWTH -> passesQualityGrowth(s, filters);
            default -> false;
        };
    }

    private boolean passesLowValuation(StockItemDto s, Map<String, Object> filters) {
        if (getDouble(filters, "maxPe") != null && s.getPeTtm() > getDouble(filters, "maxPe")) return false;
        if (getDouble(filters, "maxPb") != null && s.getPb() > getDouble(filters, "maxPb")) return false;
        if (getDouble(filters, "minRoe") != null && s.getRoe() < getDouble(filters, "minRoe")) return false;
        if (getDouble(filters, "minProfitGrowth") != null && s.getProfitGrowth() < getDouble(filters, "minProfitGrowth"))
            return false;
        return true;
    }

    private boolean passesHighDividend(StockItemDto s, Map<String, Object> filters) {
        if (getDouble(filters, "minDividendYield") != null && s.getDividendYield() < getDouble(filters, "minDividendYield"))
            return false;
        if (getDouble(filters, "minRoe") != null && s.getRoe() < getDouble(filters, "minRoe")) return false;
        if (getDouble(filters, "maxDebtRatio") != null && s.getDebtRatio() > getDouble(filters, "maxDebtRatio"))
            return false;
        // 连续分红年限在mock数据中简化为：股息率>0的默认视为满足
        return true;
    }

    private boolean passesQualityGrowth(StockItemDto s, Map<String, Object> filters) {
        if (getDouble(filters, "minRoe") != null && s.getRoe() < getDouble(filters, "minRoe")) return false;
        if (getDouble(filters, "minRevenueGrowth") != null && s.getRevenueGrowth() < getDouble(filters, "minRevenueGrowth"))
            return false;
        if (getDouble(filters, "minProfitGrowth") != null && s.getProfitGrowth() < getDouble(filters, "minProfitGrowth"))
            return false;
        if (getDouble(filters, "maxDebtRatio") != null && s.getDebtRatio() > getDouble(filters, "maxDebtRatio"))
            return false;
        if (getDouble(filters, "maxPe") != null && s.getPeTtm() > getDouble(filters, "maxPe")) return false;
        return true;
    }

    // ---------- 入选原因生成 ----------

    private String generateReason(String strategyCode, StockItemDto s, Map<String, Object> filters) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION ->
                    String.format("PE(TTM)=%.1f 和 PB=%.2f 均低于筛选阈值，同时 ROE=%.1f%% 达到基本要求",
                            s.getPeTtm(), s.getPb(), s.getRoe());
            case StrategyTemplateService.HIGH_DIVIDEND ->
                    String.format("股息率=%.1f%% 高于阈值，ROE=%.1f%% 达标，资产负债率=%.1f%% 在可接受范围内",
                            s.getDividendYield(), s.getRoe(), s.getDebtRatio());
            case StrategyTemplateService.QUALITY_GROWTH ->
                    String.format("ROE=%.1f%%、营收增长=%.1f%%、净利润增长=%.1f%% 同时达到成长条件",
                            s.getRoe(), s.getRevenueGrowth(), s.getProfitGrowth());
            default -> "符合当前策略筛选条件";
        };
    }

    // ---------- 风险标签生成 ----------

    private List<String> generateRiskTags(String strategyCode, StockItemDto s) {
        List<String> tags = new ArrayList<>();

        // 通用风险
        if (s.getDebtRatio() > 70) {
            tags.add("高负债风险");
        }
        if (s.getPeTtm() > 50 || s.getPeTtm() < 0) {
            tags.add("高估值风险");
        }
        if (s.getProfitGrowth() < 0) {
            tags.add("盈利下滑风险");
        }
        if (s.getRevenueGrowth() < 0) {
            tags.add("营收萎缩风险");
        }

        // 策略专属风险
        switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> {
                if (isCyclical(s)) tags.add("周期行业风险");
                if (s.getProfitGrowth() < 5 && s.getRevenueGrowth() < 5) {
                    tags.add("价值陷阱风险");
                }
            }
            case StrategyTemplateService.HIGH_DIVIDEND -> {
                if (s.getDividendYield() > 7) {
                    tags.add("分红波动风险");
                }
            }
            case StrategyTemplateService.QUALITY_GROWTH -> {
                if (s.getPeTtm() > 30) {
                    tags.add("高估值风险");
                }
                tags.add("成长不确定性风险");
            }
        }

        // 至少一个标签
        if (tags.isEmpty()) {
            tags.add("市场波动风险");
        }
        return tags;
    }

    /** 简单判断是否周期行业（mock用） */
    private boolean isCyclical(StockItemDto s) {
        return s.getIndustry() != null && (
                s.getIndustry().contains("钢铁") ||
                        s.getIndustry().contains("有色") ||
                        s.getIndustry().contains("化工") ||
                        s.getIndustry().contains("煤炭")
        );
    }

    // ---------- 排序 ----------

    private void sortStocks(List<StockItemDto> stocks, String sortBy, String sortDirection) {
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        Comparator<StockItemDto> cmp = switch (sortBy) {
            case "dividendYield" -> Comparator.comparingDouble(StockItemDto::getDividendYield);
            case "peTtm" -> Comparator.comparingDouble(StockItemDto::getPeTtm);
            case "pb" -> Comparator.comparingDouble(StockItemDto::getPb);
            case "roe" -> Comparator.comparingDouble(StockItemDto::getRoe);
            case "revenueGrowth" -> Comparator.comparingDouble(StockItemDto::getRevenueGrowth);
            case "profitGrowth" -> Comparator.comparingDouble(StockItemDto::getProfitGrowth);
            case "marketCap" -> Comparator.comparingDouble(StockItemDto::getMarketCap);
            default -> Comparator.comparingDouble(StockItemDto::getPeTtm);
        };
        if (desc) cmp = cmp.reversed();
        stocks.sort(cmp);
    }

    private String getDefaultSortField(String strategyCode) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> "peTtm";
            case StrategyTemplateService.HIGH_DIVIDEND -> "dividendYield";
            case StrategyTemplateService.QUALITY_GROWTH -> "roe";
            default -> "peTtm";
        };
    }

    private String getDefaultSortDirection(String strategyCode) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> "asc";
            case StrategyTemplateService.HIGH_DIVIDEND -> "desc";
            case StrategyTemplateService.QUALITY_GROWTH -> "desc";
            default -> "asc";
        };
    }

    // ---------- 辅助方法 ----------

    private static Double getDouble(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.doubleValue();
        try {
            return Double.parseDouble(v.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean getBoolean(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return false;
        if (v instanceof Boolean b) return b;
        return Boolean.parseBoolean(v.toString());
    }
}
