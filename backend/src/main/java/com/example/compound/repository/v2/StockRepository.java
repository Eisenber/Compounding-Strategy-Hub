package com.example.compound.repository.v2;

import com.example.compound.dto.v2.StockItemDto;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
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
            dto.setListingDays(rs.getInt("listing_days"));
            return dto;
        }

        private double getDouble(ResultSet rs, String column) throws SQLException {
            double v = rs.getDouble(column);
            return rs.wasNull() ? 0.0 : v;
        }
    }
}
