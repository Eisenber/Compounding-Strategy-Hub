package com.example.compound.dto.v2;

import java.util.List;

/**
 * 单只股票筛选结果
 */
public class StockItemDto {

    private String symbol;
    private String name;
    private String industry;
    private Double price;           // 可为 null（停牌等）
    private Double peTtm;           // 可为 null（数据缺失）
    private Double pb;              // 可为 null
    private Double roe;             // 可为 null
    private Double revenueGrowth;   // 可为 null
    private Double profitGrowth;    // 可为 null
    private Double dividendYield;   // 可为 null
    private Double marketCap;       // 可为 null
    private Double debtRatio;       // 可为 null
    private boolean isSt;
    private boolean isSuspended;
    private Integer listingDays;    // 可为 null
    private String reason;
    private List<String> riskTags;

    public String getSymbol() {
        return symbol;
    }

    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIndustry() {
        return industry;
    }

    public void setIndustry(String industry) {
        this.industry = industry;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }

    public Double getPeTtm() {
        return peTtm;
    }

    public void setPeTtm(Double peTtm) {
        this.peTtm = peTtm;
    }

    public Double getPb() {
        return pb;
    }

    public void setPb(Double pb) {
        this.pb = pb;
    }

    public Double getRoe() {
        return roe;
    }

    public void setRoe(Double roe) {
        this.roe = roe;
    }

    public Double getRevenueGrowth() {
        return revenueGrowth;
    }

    public void setRevenueGrowth(Double revenueGrowth) {
        this.revenueGrowth = revenueGrowth;
    }

    public Double getProfitGrowth() {
        return profitGrowth;
    }

    public void setProfitGrowth(Double profitGrowth) {
        this.profitGrowth = profitGrowth;
    }

    public Double getDividendYield() {
        return dividendYield;
    }

    public void setDividendYield(Double dividendYield) {
        this.dividendYield = dividendYield;
    }

    public Double getMarketCap() {
        return marketCap;
    }

    public void setMarketCap(Double marketCap) {
        this.marketCap = marketCap;
    }

    public Double getDebtRatio() {
        return debtRatio;
    }

    public void setDebtRatio(Double debtRatio) {
        this.debtRatio = debtRatio;
    }

    public boolean isSt() {
        return isSt;
    }

    public void setSt(boolean isSt) {
        this.isSt = isSt;
    }

    public boolean isSuspended() {
        return isSuspended;
    }

    public void setSuspended(boolean isSuspended) {
        this.isSuspended = isSuspended;
    }

    public Integer getListingDays() {
        return listingDays;
    }

    public void setListingDays(Integer listingDays) {
        this.listingDays = listingDays;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public List<String> getRiskTags() {
        return riskTags;
    }

    public void setRiskTags(List<String> riskTags) {
        this.riskTags = riskTags;
    }

    /**
     * 计算 PEG（市盈率相对盈利增长比率）。
     * PEG = PE(TTM) ÷ 净利润增长率(%)。
     * 返回 null 当数据缺失或增速 ≤ 0（PEG 无意义）。
     */
    public Double getPeg() {
        if (peTtm == null || profitGrowth == null || profitGrowth <= 0) {
            return null;
        }
        return peTtm / profitGrowth;
    }
}
