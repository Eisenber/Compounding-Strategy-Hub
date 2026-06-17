package com.example.compound.service.v2;

import com.example.compound.dto.v2.StrategyTemplateDto;
import com.example.compound.dto.v2.TemplateDetailDto;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 策略模板服务 — 管理3个新手策略模板的元数据和默认条件
 */
public class StrategyTemplateService {

    /** 策略编码常量 */
    public static final String LOW_VALUATION = "LOW_VALUATION";
    public static final String HIGH_DIVIDEND = "HIGH_DIVIDEND";
    public static final String QUALITY_GROWTH = "QUALITY_GROWTH";

    private static final List<StrategyTemplateDto> TEMPLATES = List.of(
            new StrategyTemplateDto(
                    LOW_VALUATION,
                    "低估值",
                    "筛选估值较低且盈利未明显恶化的股票 — 优先关注PE/PB偏低但ROE达到基本要求的公司"
            ),
            new StrategyTemplateDto(
                    HIGH_DIVIDEND,
                    "高股息",
                    "筛选股息率较高且分红相对稳定的股票 — 优先关注现金流回报较为可观的公司"
            ),
            new StrategyTemplateDto(
                    QUALITY_GROWTH,
                    "质量成长",
                    "筛选盈利质量和成长性较好的股票 — 优先关注ROE、营收与利润同时保持增长的公司"
            )
    );

    /**
     * 返回全部策略模板列表
     */
    public List<StrategyTemplateDto> getTemplates() {
        return TEMPLATES;
    }

    /**
     * 返回某个模板的详情，含默认筛选条件、解释文案和风险说明
     */
    public Optional<TemplateDetailDto> getTemplateDetail(String code) {
        return switch (code) {
            case LOW_VALUATION -> Optional.of(buildLowValuationDetail());
            case HIGH_DIVIDEND -> Optional.of(buildHighDividendDetail());
            case QUALITY_GROWTH -> Optional.of(buildQualityGrowthDetail());
            default -> Optional.empty();
        };
    }

    /**
     * 获取某个策略的默认筛选条件（仅Map，供筛选服务内部使用）
     */
    public Map<String, Object> getDefaultFilters(String code) {
        return getTemplateDetail(code)
                .map(TemplateDetailDto::getFilters)
                .orElse(Map.of());
    }

    // ---------- 详情构造 ----------

    private TemplateDetailDto buildLowValuationDetail() {
        TemplateDetailDto d = new TemplateDetailDto();
        d.setCode(LOW_VALUATION);
        d.setName("低估值");
        d.setExplanation("该策略优先筛选估值相对较低、盈利未明显恶化的公司。"
                + "适用场景：更关注「价格相对便宜」的用户。");
        d.setRiskNote("低估值不等于一定会上涨；可能存在周期行业、业绩下滑或价值陷阱。");
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("maxPe", 15);
        filters.put("maxPb", 1.8);
        filters.put("minRoe", 8);
        filters.put("minProfitGrowth", 0);
        filters.put("excludeSt", true);
        filters.put("excludeSuspended", true);
        filters.put("minListingDays", 180);
        d.setFilters(filters);
        return d;
    }

    private TemplateDetailDto buildHighDividendDetail() {
        TemplateDetailDto d = new TemplateDetailDto();
        d.setCode(HIGH_DIVIDEND);
        d.setName("高股息");
        d.setExplanation("该策略优先筛选股息率较高且分红相对稳定的公司。"
                + "适用场景：偏好稳健分红、希望关注现金流回报的用户。");
        d.setRiskNote("高股息可能来自股价下跌；分红稳定不代表未来分红不变。");
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("minDividendYield", 4);
        filters.put("minConsecutiveDividendYears", 3);
        filters.put("minRoe", 8);
        filters.put("maxDebtRatio", 70);
        filters.put("excludeSt", true);
        filters.put("excludeSuspended", true);
        d.setFilters(filters);
        return d;
    }

    private TemplateDetailDto buildQualityGrowthDetail() {
        TemplateDetailDto d = new TemplateDetailDto();
        d.setCode(QUALITY_GROWTH);
        d.setName("质量成长");
        d.setExplanation("该策略优先筛选盈利质量和成长性表现较好的公司。"
                + "适用场景：偏好业绩质量和成长性的用户。");
        d.setRiskNote("高成长通常伴随更高估值和波动；成长延续性存在不确定性。");
        Map<String, Object> filters = new LinkedHashMap<>();
        filters.put("minRoe", 12);
        filters.put("minRevenueGrowth", 15);
        filters.put("minProfitGrowth", 15);
        filters.put("maxDebtRatio", 60);
        filters.put("maxPe", 40);
        filters.put("excludeSt", true);
        filters.put("excludeSuspended", true);
        d.setFilters(filters);
        return d;
    }
}
