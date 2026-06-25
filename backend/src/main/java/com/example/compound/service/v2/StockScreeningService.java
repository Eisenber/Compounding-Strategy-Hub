package com.example.compound.service.v2;

import com.example.compound.repository.v2.StockRepository;
import com.example.compound.dto.v2.ScreenRequestDto;
import com.example.compound.dto.v2.ScreenResponseDto;
import com.example.compound.dto.v2.StockItemDto;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 股票筛选服务 — 负责按策略模板条件筛选、排序、分页，并生成入选原因和风险标签。
 * <p>
 * MVP 阶段基于 MockStockDataProvider 的本地数据运行，不接外部数据源。
 */
@Service
public class StockScreeningService {

    private final StrategyTemplateService templateService;
    private final StockRepository stockRepository;

    public StockScreeningService(StrategyTemplateService templateService,
                                  StockRepository stockRepository) {
        this.templateService = templateService;
        this.stockRepository = stockRepository;
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
        List<StockItemDto> allStocks = stockRepository.getAllStocks();

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

    /** 通用排除规则：ST、停牌、次新股 — 使用真实数据字段 */
    private boolean isExcludedByCommonRules(StockItemDto s, Map<String, Object> filters) {
        // 排除 ST（使用真实 isSt 字段）
        if (getBoolean(filters, "excludeSt") && s.isSt()) {
            return true;
        }
        // 排除停牌（使用真实 isSuspended 字段）
        if (getBoolean(filters, "excludeSuspended") && s.isSuspended()) {
            return true;
        }
        // 排除上市未满 N 天（listingDays 为 null 时跳过检查）
        Integer minDays = getInt(filters, "minListingDays");
        Integer listingDays = s.getListingDays();
        if (minDays != null && listingDays != null && listingDays > 0 && listingDays < minDays) {
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
            case StrategyTemplateService.PEG_VALUATION -> passesPegValuation(s, filters);
            case StrategyTemplateService.MAGIC_FORMULA -> passesMagicFormula(s, filters);
            default -> false;
        };
    }

    /** 安全比较：stockVal 为 null（数据缺失）时跳过该筛选条件 */
    private static boolean exceeds(Double stockVal, Double threshold, boolean isMax) {
        if (stockVal == null || threshold == null) return false;
        return isMax ? stockVal > threshold : stockVal < threshold;
    }

    private boolean passesLowValuation(StockItemDto s, Map<String, Object> filters) {
        // 排除负 PE（亏损公司不是"低估值"而是"无估值"）
        if (s.getPeTtm() != null && s.getPeTtm() < 0) return false;
        if (exceeds(s.getPeTtm(), getDouble(filters, "maxPe"), true)) return false;
        if (exceeds(s.getPb(), getDouble(filters, "maxPb"), true)) return false;
        if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
        if (exceeds(s.getProfitGrowth(), getDouble(filters, "minProfitGrowth"), false)) return false;
        return true;
    }

    private boolean passesHighDividend(StockItemDto s, Map<String, Object> filters) {
        if (exceeds(s.getDividendYield(), getDouble(filters, "minDividendYield"), false)) return false;
        if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
        if (exceeds(s.getDebtRatio(), getDouble(filters, "maxDebtRatio"), true)) return false;
        // 连续分红年限在mock数据中简化为：股息率>0的默认视为满足
        return true;
    }

    private boolean passesQualityGrowth(StockItemDto s, Map<String, Object> filters) {
        // 排除负 PE（亏损公司不具备成长质量基础）
        if (s.getPeTtm() != null && s.getPeTtm() < 0) return false;
        if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
        if (exceeds(s.getRevenueGrowth(), getDouble(filters, "minRevenueGrowth"), false)) return false;
        if (exceeds(s.getProfitGrowth(), getDouble(filters, "minProfitGrowth"), false)) return false;
        if (exceeds(s.getDebtRatio(), getDouble(filters, "maxDebtRatio"), true)) return false;
        if (exceeds(s.getPeTtm(), getDouble(filters, "maxPe"), true)) return false;
        return true;
    }

    private boolean passesPegValuation(StockItemDto s, Map<String, Object> filters) {
        // 亏损公司 PEG 无意义
        if (s.getPeTtm() != null && s.getPeTtm() < 0) return false;
        // 负增速 PEG 无意义
        if (s.getProfitGrowth() != null && s.getProfitGrowth() <= 0) return false;
        // PEG 检查
        Double maxPeg = getDouble(filters, "maxPeg");
        Double peg = s.getPeg();
        if (maxPeg != null && peg != null && peg > maxPeg) return false;
        // ROE 门槛
        if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
        // 增速门槛
        if (exceeds(s.getProfitGrowth(), getDouble(filters, "minProfitGrowth"), false)) return false;
        // PE 上限
        if (exceeds(s.getPeTtm(), getDouble(filters, "maxPe"), true)) return false;
        return true;
    }

    private boolean passesMagicFormula(StockItemDto s, Map<String, Object> filters) {
        // 亏损公司排除
        if (s.getPeTtm() != null && s.getPeTtm() < 0) return false;
        // 高质量：ROE 门槛
        if (exceeds(s.getRoe(), getDouble(filters, "minRoe"), false)) return false;
        // 好价格：PE 上限
        if (exceeds(s.getPeTtm(), getDouble(filters, "maxPe"), true)) return false;
        // 杠杆控制
        if (exceeds(s.getDebtRatio(), getDouble(filters, "maxDebtRatio"), true)) return false;
        return true;
    }

    // ---------- 入选原因生成 ----------

    private static String fmtD(Double v) {
        return v != null ? String.format("%.1f", v) : "缺失";
    }

    private String generateReason(String strategyCode, StockItemDto s, Map<String, Object> filters) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION ->
                    String.format("PE(TTM)=%s 和 PB=%s 均低于筛选阈值，同时 ROE=%s%% 达到基本要求",
                            fmtD(s.getPeTtm()), fmtD(s.getPb()), fmtD(s.getRoe()));
            case StrategyTemplateService.HIGH_DIVIDEND ->
                    String.format("股息率=%s%%，ROE=%s%%，资产负债率=%s%% 在可接受范围内",
                            fmtD(s.getDividendYield()), fmtD(s.getRoe()), fmtD(s.getDebtRatio()));
            case StrategyTemplateService.QUALITY_GROWTH ->
                    String.format("ROE=%s%%、营收增长=%s%%、净利润增长=%s%% 同时达到成长条件",
                            fmtD(s.getRoe()), fmtD(s.getRevenueGrowth()), fmtD(s.getProfitGrowth()));
            case StrategyTemplateService.PEG_VALUATION -> {
                Double peg = s.getPeg();
                String pegStr = peg != null ? String.format("%.2f", peg) : "N/A";
                yield String.format("PEG=%s（PE=%s÷增速%s%%），成长相对估值偏低",
                        pegStr, fmtD(s.getPeTtm()), fmtD(s.getProfitGrowth()));
            }
            case StrategyTemplateService.MAGIC_FORMULA -> {
                Double ey = s.getPeTtm() != null && s.getPeTtm() > 0
                        ? 100.0 / s.getPeTtm() : null;
                yield String.format("ROE=%s%%且盈利收益率=%s%%（PE=%s），兼备质量与价格",
                        fmtD(s.getRoe()),
                        ey != null ? String.format("%.1f", ey) : "缺失",
                        fmtD(s.getPeTtm()));
            }
            default -> "符合当前策略筛选条件";
        };
    }

    // ---------- 风险标签生成 ----------

    private List<String> generateRiskTags(String strategyCode, StockItemDto s) {
        List<String> tags = new ArrayList<>();

        // 通用风险（null 值跳过）
        Double dr = s.getDebtRatio();
        if (dr != null && dr > 70) {
            tags.add("高负债风险");
        }
        Double pe = s.getPeTtm();
        if (pe != null && (pe > 50 || pe < 0)) {
            tags.add("高估值风险");
        }
        Double pg = s.getProfitGrowth();
        if (pg != null && pg < 0) {
            tags.add("盈利下滑风险");
        }
        Double rg = s.getRevenueGrowth();
        if (rg != null && rg < 0) {
            tags.add("营收萎缩风险");
        }

        // 策略专属风险
        switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> {
                if (isCyclical(s)) tags.add("周期行业风险");
                if (pg != null && pg < 5 && rg != null && rg < 5) {
                    tags.add("价值陷阱风险");
                }
            }
            case StrategyTemplateService.HIGH_DIVIDEND -> {
                Double dy = s.getDividendYield();
                if (dy != null && dy > 7) {
                    tags.add("分红波动风险");
                }
            }
            case StrategyTemplateService.QUALITY_GROWTH -> {
                if (pe != null && pe > 30) {
                    tags.add("高估值风险");
                }
                tags.add("成长不确定性风险");
            }
            case StrategyTemplateService.PEG_VALUATION -> {
                if (pg != null && pg < 15 && pg > 0) {
                    tags.add("盈利增速放缓风险");
                }
                if (s.getPeg() != null && s.getPeg() > 0.8) {
                    tags.add("成长性价比不足风险");
                }
            }
            case StrategyTemplateService.MAGIC_FORMULA -> {
                if (dr != null && dr > 50) {
                    tags.add("杠杆率风险");
                }
                if (pe != null && pe < 5) {
                    tags.add("低PE陷阱风险");
                }
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

    /** 构建 null-safe 数值比较器（null 值排在最后） */
    private static Comparator<Double> nullSafeComparator(boolean desc) {
        Comparator<Double> natural = Comparator.nullsLast(Double::compareTo);
        return desc ? natural.reversed() : natural;
    }

    private void sortStocks(List<StockItemDto> stocks, String sortBy, String sortDirection) {
        boolean desc = "desc".equalsIgnoreCase(sortDirection);
        Comparator<StockItemDto> cmp = switch (sortBy) {
            case "dividendYield" -> Comparator.comparing(StockItemDto::getDividendYield, nullSafeComparator(desc));
            case "peTtm" -> Comparator.comparing(StockItemDto::getPeTtm, nullSafeComparator(desc));
            case "pb" -> Comparator.comparing(StockItemDto::getPb, nullSafeComparator(desc));
            case "roe" -> Comparator.comparing(StockItemDto::getRoe, nullSafeComparator(desc));
            case "revenueGrowth" -> Comparator.comparing(StockItemDto::getRevenueGrowth, nullSafeComparator(desc));
            case "profitGrowth" -> Comparator.comparing(StockItemDto::getProfitGrowth, nullSafeComparator(desc));
            case "marketCap" -> Comparator.comparing(StockItemDto::getMarketCap, nullSafeComparator(desc));
            case "peg" -> Comparator.comparing(StockItemDto::getPeg, nullSafeComparator(desc));
            default -> Comparator.comparing(StockItemDto::getPeTtm, nullSafeComparator(desc));
        };
        stocks.sort(cmp);
    }

    private String getDefaultSortField(String strategyCode) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> "peTtm";
            case StrategyTemplateService.HIGH_DIVIDEND -> "dividendYield";
            case StrategyTemplateService.QUALITY_GROWTH -> "roe";
            case StrategyTemplateService.PEG_VALUATION -> "peg";
            case StrategyTemplateService.MAGIC_FORMULA -> "roe";
            default -> "peTtm";
        };
    }

    private String getDefaultSortDirection(String strategyCode) {
        return switch (strategyCode) {
            case StrategyTemplateService.LOW_VALUATION -> "asc";
            case StrategyTemplateService.HIGH_DIVIDEND -> "desc";
            case StrategyTemplateService.QUALITY_GROWTH -> "desc";
            case StrategyTemplateService.PEG_VALUATION -> "asc";
            case StrategyTemplateService.MAGIC_FORMULA -> "desc";
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

    private static Integer getInt(Map<String, Object> map, String key) {
        Object v = map.get(key);
        if (v == null) return null;
        if (v instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(v.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
