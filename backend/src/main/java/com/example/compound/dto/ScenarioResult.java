package com.example.compound.dto;

import java.util.List;

public class ScenarioResult {

    private String name;
    private double totalInvested;
    private double finalAmount;
    private double totalProfit;
    private double profitMultiple;
    private double realFinalAmount;
    private List<YearlyPoint> yearlyPoints;

    public ScenarioResult() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getTotalInvested() { return totalInvested; }
    public void setTotalInvested(double totalInvested) { this.totalInvested = totalInvested; }

    public double getFinalAmount() { return finalAmount; }
    public void setFinalAmount(double finalAmount) { this.finalAmount = finalAmount; }

    public double getTotalProfit() { return totalProfit; }
    public void setTotalProfit(double totalProfit) { this.totalProfit = totalProfit; }

    public double getProfitMultiple() { return profitMultiple; }
    public void setProfitMultiple(double profitMultiple) { this.profitMultiple = profitMultiple; }

    public double getRealFinalAmount() { return realFinalAmount; }
    public void setRealFinalAmount(double realFinalAmount) { this.realFinalAmount = realFinalAmount; }

    public List<YearlyPoint> getYearlyPoints() { return yearlyPoints; }
    public void setYearlyPoints(List<YearlyPoint> yearlyPoints) { this.yearlyPoints = yearlyPoints; }
}
