package com.example.compound.dto.v2;

import java.util.List;

/**
 * 单只股票筛选结果
 */
public class StockItemDto {

    private String symbol;
    private String name;
    private String industry;
    private double price;
    private double peTtm;
    private double pb;
    private double roe;
    private double revenueGrowth;
    private double profitGrowth;
    private double dividendYield;
    private double marketCap;
    private double debtRatio;
    private boolean isSt;
    private boolean isSuspended;
    private int listingDays;
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

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public double getPeTtm() {
        return peTtm;
    }

    public void setPeTtm(double peTtm) {
        this.peTtm = peTtm;
    }

    public double getPb() {
        return pb;
    }

    public void setPb(double pb) {
        this.pb = pb;
    }

    public double getRoe() {
        return roe;
    }

    public void setRoe(double roe) {
        this.roe = roe;
    }

    public double getRevenueGrowth() {
        return revenueGrowth;
    }

    public void setRevenueGrowth(double revenueGrowth) {
        this.revenueGrowth = revenueGrowth;
    }

    public double getProfitGrowth() {
        return profitGrowth;
    }

    public void setProfitGrowth(double profitGrowth) {
        this.profitGrowth = profitGrowth;
    }

    public double getDividendYield() {
        return dividendYield;
    }

    public void setDividendYield(double dividendYield) {
        this.dividendYield = dividendYield;
    }

    public double getMarketCap() {
        return marketCap;
    }

    public void setMarketCap(double marketCap) {
        this.marketCap = marketCap;
    }

    public double getDebtRatio() {
        return debtRatio;
    }

    public void setDebtRatio(double debtRatio) {
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

    public int getListingDays() {
        return listingDays;
    }

    public void setListingDays(int listingDays) {
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
}
