package com.example.compound.dto.v2;

import java.util.List;

/**
 * 筛选响应 — 用于 POST /api/v2/strategies/screen 响应
 */
public class ScreenResponseDto {

    private int total;
    private int page;
    private int pageSize;
    private List<StockItemDto> items;

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getPageSize() {
        return pageSize;
    }

    public void setPageSize(int pageSize) {
        this.pageSize = pageSize;
    }

    public List<StockItemDto> getItems() {
        return items;
    }

    public void setItems(List<StockItemDto> items) {
        this.items = items;
    }
}
