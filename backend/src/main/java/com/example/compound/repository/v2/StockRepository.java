package com.example.compound.repository.v2;

import com.example.compound.dto.v2.DataStatusDto;
import com.example.compound.dto.v2.StockItemDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * A股数据仓库 — 从 SQLite compound.db 读取全A股行情与财务数据。
 * <p>
 * 数据由 Python fetch_stocks.py 脚本每日更新，此类只读。
 */
@Repository
public class StockRepository {

    private final JdbcTemplate jdbc;

    public StockRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 返回全量A股数据（与旧 MockStockDataProvider.getAllStocks() 接口一致）。
     * 调用方在内存中完成筛选/排序/分页。
     */
    public List<StockItemDto> getAllStocks() {
        String sql = """
                SELECT symbol, name, industry, price, pe_ttm, pb, roe,
                       revenue_growth, profit_growth, dividend_yield,
                       market_cap, debt_ratio, is_st, is_suspended, listing_days
                FROM stocks
                """;
        return jdbc.query(sql, new StockRowMapper());
    }

    /**
     * RowMapper: ResultSet → StockItemDto
     */
    private static class StockRowMapper implements RowMapper<StockItemDto> {
        @Override
        public StockItemDto mapRow(ResultSet rs, int rowNum) throws SQLException {
            StockItemDto dto = new StockItemDto();
            dto.setSymbol(rs.getString("symbol"));
            dto.setName(rs.getString("name"));
            dto.setIndustry(rs.getString("industry"));
            dto.setPrice(getDouble(rs, "price"));
            dto.setPeTtm(getDouble(rs, "pe_ttm"));
            dto.setPb(getDouble(rs, "pb"));
            dto.setRoe(getDouble(rs, "roe"));
            dto.setRevenueGrowth(getDouble(rs, "revenue_growth"));
            dto.setProfitGrowth(getDouble(rs, "profit_growth"));
            dto.setDividendYield(getDouble(rs, "dividend_yield"));
            dto.setMarketCap(getDouble(rs, "market_cap"));
            dto.setDebtRatio(getDouble(rs, "debt_ratio"));
            dto.setSt(rs.getInt("is_st") == 1);
            dto.setSuspended(rs.getInt("is_suspended") == 1);
            dto.setListingDays(getInteger(rs, "listing_days"));
            return dto;
        }

        private Double getDouble(ResultSet rs, String column) throws SQLException {
            double v = rs.getDouble(column);
            return rs.wasNull() ? null : v;
        }

        private Integer getInteger(ResultSet rs, String column) throws SQLException {
            int v = rs.getInt(column);
            return rs.wasNull() ? null : v;
        }
    }

    /**
     * 查询数据状态 — 从 data_log 表获取最近一次更新信息。
     */
    public DataStatusDto getDataStatus() {
        DataStatusDto dto = new DataStatusDto();
        dto.setRefreshing(false);

        // 最近一次成功的更新
        List<DataStatusDto> successRows = jdbc.query(
                "SELECT run_at, stock_count FROM data_log WHERE status = 'SUCCESS' ORDER BY id DESC LIMIT 1",
                (rs, rowNum) -> {
                    DataStatusDto d = new DataStatusDto();
                    d.setLastUpdated(rs.getString("run_at"));
                    d.setStockCount(rs.getInt("stock_count"));
                    return d;
                });

        // 最近一次任意状态（用于检测失败）
        List<DataStatusDto> latestRows = jdbc.query(
                "SELECT status, error_msg FROM data_log ORDER BY id DESC LIMIT 1",
                (rs, rowNum) -> {
                    DataStatusDto d = new DataStatusDto();
                    d.setLastStatus(rs.getString("status"));
                    d.setLastError(rs.getString("error_msg"));
                    return d;
                });

        if (successRows.isEmpty()) {
            // 从未成功更新过
            dto.setLastUpdated(null);
            dto.setStockCount(0);
            dto.setStaleMinutes(-1);
            dto.setLastStatus(latestRows.isEmpty() ? "NO_DATA" :
                    latestRows.get(0).getLastStatus() != null ? latestRows.get(0).getLastStatus() : "NO_DATA");
            dto.setLastError(latestRows.isEmpty() ? null : latestRows.get(0).getLastError());
        } else {
            DataStatusDto success = successRows.get(0);
            dto.setLastUpdated(success.getLastUpdated());
            dto.setStockCount(success.getStockCount());

            // 计算距今分钟数
            try {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
                LocalDateTime updated = LocalDateTime.parse(success.getLastUpdated(), fmt);
                dto.setStaleMinutes(Duration.between(updated, LocalDateTime.now()).toMinutes());
            } catch (Exception e) {
                dto.setStaleMinutes(-1);
            }

            // 最新状态
            if (latestRows.isEmpty()) {
                dto.setLastStatus("SUCCESS");
                dto.setLastError(null);
            } else {
                dto.setLastStatus(latestRows.get(0).getLastStatus());
                dto.setLastError(latestRows.get(0).getLastError());
            }
        }

        return dto;
    }
}
