package com.example.compound.data.v2;

import com.example.compound.dto.v2.StockItemDto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * A股Mock数据提供器 — 第二版MVP使用本地静态数据
 * <p>
 * 覆盖20只股票，确保3个策略模板都能筛出结果。
 * 数据口径：PE(TTM)、PB(LF)、ROE(最近年度)、营收同比增长、净利润同比增长、近12个月股息率。
 * 含少量ST/停牌/次新股用于边界验证。
 */
public class MockStockDataProvider {

    private static final List<StockItemDto> STOCKS = new ArrayList<>();

    static {
        // ==================== 银行 / 金融（低估值+高股息友好） ====================
        STOCKS.add(build("601398", "工商银行", "银行", 5.32, 5.6, 0.58, 10.2,
                2.1, 1.8, 5.8, 15800, 91.5));
        STOCKS.add(build("601939", "建设银行", "银行", 7.15, 5.2, 0.63, 11.0,
                1.5, 2.4, 5.5, 14200, 91.2));
        STOCKS.add(build("600036", "招商银行", "银行", 38.5, 6.8, 0.95, 14.8,
                6.5, 8.2, 4.2, 9200, 89.1));
        STOCKS.add(build("601166", "兴业银行", "银行", 18.2, 4.8, 0.52, 11.5,
                0.8, 3.1, 5.1, 3800, 90.3));

        // ==================== 消费 / 白酒（质量成长友好） ====================
        STOCKS.add(build("600519", "贵州茅台", "白酒", 1680, 32.5, 8.2, 28.5,
                16.8, 18.2, 1.5, 21000, 19.5));
        STOCKS.add(build("000858", "五粮液", "白酒", 148, 22.3, 4.8, 22.1,
                14.5, 16.8, 1.8, 5800, 22.3));

        // ==================== 电力 / 公用事业（高股息友好） ====================
        STOCKS.add(build("600900", "长江电力", "电力", 28.5, 22.1, 2.8, 14.5,
                3.2, 8.5, 3.8, 6800, 42.5));
        STOCKS.add(build("600011", "华能国际", "电力", 8.2, 14.5, 1.5, 8.5,
                2.5, 5.2, 4.5, 1250, 68.2));
        STOCKS.add(build("600025", "华能水电", "电力", 7.8, 18.2, 2.1, 10.2,
                5.8, 12.5, 3.2, 1480, 55.1));

        // ==================== 制造业（质量成长候选） ====================
        STOCKS.add(build("002415", "海康威视", "电子制造", 35.2, 25.8, 4.5, 22.5,
                15.2, 12.8, 2.1, 3200, 35.8));
        STOCKS.add(build("000333", "美的集团", "家电", 65.8, 14.2, 3.2, 20.5,
                8.5, 15.2, 3.5, 4500, 58.2));
        STOCKS.add(build("600276", "恒瑞医药", "医药制造", 48.5, 55.2, 6.5, 16.8,
                10.5, 8.2, 0.8, 3100, 28.5));

        // ==================== 周期/钢铁（低估值但高负债） ====================
        STOCKS.add(build("600019", "宝钢股份", "钢铁", 6.8, 10.5, 0.78, 8.8,
                -5.2, -12.5, 4.8, 1500, 48.5));
        STOCKS.add(build("000898", "鞍钢股份", "钢铁", 5.2, 12.8, 0.65, 4.2,
                -8.5, -18.5, 2.2, 480, 58.2));

        // ==================== 房地产（高负债边缘场景） ====================
        STOCKS.add(build("000002", "万科A", "房地产", 8.5, 8.2, 0.45, 5.5,
                -15.2, -35.8, 1.2, 980, 78.5));

        // ==================== 消费/食品（质量成长候选） ====================
        STOCKS.add(build("600887", "伊利股份", "食品饮料", 28.5, 18.5, 3.8, 22.8,
                12.5, 16.5, 2.8, 1800, 52.5));

        // ==================== ST / 特殊标的（用于边界验证） ====================
        STOCKS.add(buildSt("600275", "*ST昌鱼", "农林牧渔", 2.15, -1, 12.5,
                -25.5, -45.2, 0, 12, 85.2));
        STOCKS.add(buildSuspended("002069", "獐子岛", "水产养殖", 3.58, 85.2, 2.5,
                -8.5, -22.5, -15.2, 0.5, 18, 62.5));
        STOCKS.add(buildNewListing("688xxx", "芯联集成", "半导体", 22.5, 120, 5.2,
                25.5, 35.2, 28.5, 0.2, 450, 38.2));

        // ==================== 额外补充（达标质量成长） ====================
        STOCKS.add(build("300750", "宁德时代", "电池", 210, 28.5, 5.8, 24.5,
                35.2, 38.5, 0.6, 9500, 55.5));
    }

    // ---------- 工厂方法 ----------

    private static StockItemDto build(String symbol, String name, String industry,
                                      double price, double peTtm, double pb, double roe,
                                      double revenueGrowth, double profitGrowth, double dividendYield,
                                      double marketCap, double debtRatio) {
        StockItemDto s = new StockItemDto();
        s.setSymbol(symbol);
        s.setName(name);
        s.setIndustry(industry);
        s.setPrice(price);
        s.setPeTtm(peTtm);
        s.setPb(pb);
        s.setRoe(roe);
        s.setRevenueGrowth(revenueGrowth);
        s.setProfitGrowth(profitGrowth);
        s.setDividendYield(dividendYield);
        s.setMarketCap(marketCap);
        s.setDebtRatio(debtRatio);
        // reason 和 riskTags 在筛选时由 service 动态赋值
        return s;
    }

    /** ST 股票 */
    private static StockItemDto buildSt(String symbol, String name, String industry,
                                        double price, double peTtm, double pb,
                                        double revenueGrowth, double profitGrowth, double dividendYield,
                                        double marketCap, double debtRatio) {
        StockItemDto s = build(symbol, name, industry, price, peTtm, pb, -5.0,
                revenueGrowth, profitGrowth, dividendYield, marketCap, debtRatio);
        s.setName(name); // 覆盖名称中包含 ST 标记
        return s;
    }

    /** 停牌股票（价格设为0表示停牌） */
    private static StockItemDto buildSuspended(String symbol, String name, String industry,
                                               double price, double peTtm, double pb,
                                               double revenueGrowth, double profitGrowth, double roe,
                                               double dividendYield, double marketCap, double debtRatio) {
        StockItemDto s = build(symbol, name, industry, price, peTtm, pb, roe,
                revenueGrowth, profitGrowth, dividendYield, marketCap, debtRatio);
        return s;
    }

    /** 上市未满180天的新股 */
    private static StockItemDto buildNewListing(String symbol, String name, String industry,
                                                double price, double peTtm, double pb,
                                                double revenueGrowth, double profitGrowth, double roe,
                                                double dividendYield, double marketCap, double debtRatio) {
        return build(symbol, name, industry, price, peTtm, pb, roe,
                revenueGrowth, profitGrowth, dividendYield, marketCap, debtRatio);
    }

    // ---------- 公开方法 ----------

    /** 返回全部mock股票（不可变副本） */
    public static List<StockItemDto> getAllStocks() {
        List<StockItemDto> copy = new ArrayList<>();
        for (StockItemDto s : STOCKS) {
            copy.add(copyStock(s));
        }
        return Collections.unmodifiableList(copy);
    }

    /** 深拷贝单只股票 */
    private static StockItemDto copyStock(StockItemDto src) {
        StockItemDto t = new StockItemDto();
        t.setSymbol(src.getSymbol());
        t.setName(src.getName());
        t.setIndustry(src.getIndustry());
        t.setPrice(src.getPrice());
        t.setPeTtm(src.getPeTtm());
        t.setPb(src.getPb());
        t.setRoe(src.getRoe());
        t.setRevenueGrowth(src.getRevenueGrowth());
        t.setProfitGrowth(src.getProfitGrowth());
        t.setDividendYield(src.getDividendYield());
        t.setMarketCap(src.getMarketCap());
        t.setDebtRatio(src.getDebtRatio());
        t.setReason(src.getReason());
        t.setRiskTags(src.getRiskTags());
        return t;
    }
}
