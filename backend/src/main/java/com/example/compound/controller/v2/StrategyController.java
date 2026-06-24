package com.example.compound.controller.v2;

import com.example.compound.dto.v2.*;
import com.example.compound.repository.v2.StockRepository;
import com.example.compound.service.DataRefreshService;
import com.example.compound.service.v2.StockScreeningService;
import com.example.compound.service.v2.StrategyTemplateService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 第二版选股策略接口 — 全部以 /api/v2/strategies 为前缀，与第一版 /api/v1/ 完全隔离。
 */
@RestController
@RequestMapping("/api/v2/strategies")
public class StrategyController {

    private final StrategyTemplateService templateService;
    private final StockScreeningService screeningService;
    private final StockRepository stockRepository;
    private final DataRefreshService dataRefreshService;

    public StrategyController(StrategyTemplateService templateService,
                               StockScreeningService screeningService,
                               StockRepository stockRepository,
                               DataRefreshService dataRefreshService) {
        this.templateService = templateService;
        this.screeningService = screeningService;
        this.stockRepository = stockRepository;
        this.dataRefreshService = dataRefreshService;
    }

    /**
     * GET /api/v2/strategies/templates
     * <p>
     * 返回全部策略模板列表
     */
    @GetMapping("/templates")
    public ResponseEntity<List<StrategyTemplateDto>> getTemplates() {
        return ResponseEntity.ok(templateService.getTemplates());
    }

    /**
     * GET /api/v2/strategies/templates/{code}
     * <p>
     * 返回某个策略模板的详情，含默认筛选条件、解释文案和风险说明
     */
    @GetMapping("/templates/{code}")
    public ResponseEntity<?> getTemplateDetail(@PathVariable String code) {
        Optional<TemplateDetailDto> detail = templateService.getTemplateDetail(code);
        if (detail.isPresent()) {
            return ResponseEntity.ok(detail.get());
        }
        return ResponseEntity.status(404).body(
                Map.of("error", "策略模板不存在", "code", code)
        );
    }

    /**
     * POST /api/v2/strategies/screen
     * <p>
     * 根据策略模板和筛选条件，返回符合条件的股票列表
     */
    @PostMapping("/screen")
    public ResponseEntity<?> screen(@RequestBody ScreenRequestDto request) {
        // 参数校验
        String code = request.getStrategyCode();
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "strategyCode 不能为空")
            );
        }
        if (templateService.getTemplateDetail(code).isEmpty()) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "无效的策略编码", "code", code,
                            "validCodes", List.of("LOW_VALUATION", "HIGH_DIVIDEND", "QUALITY_GROWTH"))
            );
        }
        // 页大小上限
        if (request.getPageSize() > 50) {
            request.setPageSize(50);
        }
        if (request.getPage() < 1) {
            request.setPage(1);
        }

        ScreenResponseDto response = screeningService.screen(request);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/v2/strategies/data-status
     * <p>
     * 返回数据新鲜度状态：最近更新时间、股票数量、是否在刷新中等
     */
    @GetMapping("/data-status")
    public ResponseEntity<DataStatusDto> getDataStatus() {
        DataStatusDto status = stockRepository.getDataStatus();
        status.setRefreshing(dataRefreshService.isRefreshing());
        return ResponseEntity.ok(status);
    }

    /**
     * POST /api/v2/strategies/refresh
     * <p>
     * 手动触发数据刷新（异步执行，立即返回）。
     * 如果已有刷新在进行中，返回 409。
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> triggerRefresh() {
        if (dataRefreshService.isRefreshing()) {
            return ResponseEntity.status(409).body(
                    Map.of("error", "数据更新正在进行中，请稍后再试", "isRefreshing", true)
            );
        }
        dataRefreshService.triggerRefreshAsync();
        return ResponseEntity.accepted().body(
                Map.of("message", "数据更新已开始", "isRefreshing", true)
        );
    }
}
