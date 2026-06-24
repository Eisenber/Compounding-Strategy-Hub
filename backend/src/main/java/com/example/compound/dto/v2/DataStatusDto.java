package com.example.compound.dto.v2;

/**
 * 数据状态 DTO — 用于 GET /api/v2/strategies/data-status 响应
 */
public class DataStatusDto {

    private String lastUpdated;      // 最近成功更新时间（ISO格式，无数据时为 null）
    private int stockCount;          // 最近成功更新的股票数量
    private String lastStatus;       // "SUCCESS" | "FAILED" | "NO_DATA"
    private String lastError;        // 最近失败的错误信息（成功时为 null）
    private long staleMinutes;       // 距今分钟数（无数据时为 -1）
    private boolean isRefreshing;    // 是否正在刷新中

    public String getLastUpdated() {
        return lastUpdated;
    }

    public void setLastUpdated(String lastUpdated) {
        this.lastUpdated = lastUpdated;
    }

    public int getStockCount() {
        return stockCount;
    }

    public void setStockCount(int stockCount) {
        this.stockCount = stockCount;
    }

    public String getLastStatus() {
        return lastStatus;
    }

    public void setLastStatus(String lastStatus) {
        this.lastStatus = lastStatus;
    }

    public String getLastError() {
        return lastError;
    }

    public void setLastError(String lastError) {
        this.lastError = lastError;
    }

    public long getStaleMinutes() {
        return staleMinutes;
    }

    public void setStaleMinutes(long staleMinutes) {
        this.staleMinutes = staleMinutes;
    }

    public boolean isRefreshing() {
        return isRefreshing;
    }

    public void setRefreshing(boolean isRefreshing) {
        this.isRefreshing = isRefreshing;
    }
}
