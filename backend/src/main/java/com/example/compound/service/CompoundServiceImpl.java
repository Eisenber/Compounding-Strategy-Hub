package com.example.compound.service;

import com.example.compound.dto.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class CompoundServiceImpl implements CompoundService {

    @Override
    public CompareResponse compare(CompareRequest request) {
        List<ScenarioInput> inputs = request.getScenarios();
        List<ScenarioResult> results = new ArrayList<>();

        for (ScenarioInput input : inputs) {
            results.add(calculateOneScenario(input));
        }

        // 按实际购买力找出最优方案
        ScenarioResult best = results.stream()
                .max(Comparator.comparingDouble(ScenarioResult::getRealFinalAmount))
                .orElse(results.get(0));

        // 生成结论
        List<String> insights = generateInsights(results);

        CompareResponse response = new CompareResponse();
        response.setBestScenarioName(best.getName());
        response.setScenarios(results);
        response.setInsights(insights);

        return response;
    }

    /**
     * 计算单个方案的复利结果
     */
    private ScenarioResult calculateOneScenario(ScenarioInput input) {
        int totalMonths = input.getYears() * 12;

        // 月净收益率 = (1 + annualReturnRate - annualFeeRate)^(1/12) - 1
        double monthlyNetRate = Math.pow(1 + input.getAnnualReturnRate() - input.getAnnualFeeRate(), 1.0 / 12.0) - 1;

        // 按月滚动计算资产
        double currentAmount = input.getInitialPrincipal();
        List<YearlyPoint> yearlyPoints = new ArrayList<>();

        // 第 0 年的初始值
        yearlyPoints.add(new YearlyPoint(0, round2(currentAmount)));

        for (int month = 1; month <= totalMonths; month++) {
            // 每月末：先追加定投金额，再按当月收益率增长
            currentAmount = (currentAmount + input.getMonthlyContribution()) * (1 + monthlyNetRate);

            // 每年末记录一个数据点
            if (month % 12 == 0) {
                yearlyPoints.add(new YearlyPoint(month / 12, round2(currentAmount)));
            }
        }

        double finalAmount = currentAmount;
        double totalInvested = input.getInitialPrincipal() + input.getMonthlyContribution() * totalMonths;
        double totalProfit = finalAmount - totalInvested;
        double profitMultiple = finalAmount / totalInvested;
        // 实际购买力 = finalAmount / (1 + inflationRate)^years
        double realFinalAmount = finalAmount / Math.pow(1 + input.getInflationRate(), input.getYears());

        ScenarioResult result = new ScenarioResult();
        result.setName(input.getName());
        result.setTotalInvested(round2(totalInvested));
        result.setFinalAmount(round2(finalAmount));
        result.setTotalProfit(round2(totalProfit));
        result.setProfitMultiple(round4(profitMultiple));
        result.setRealFinalAmount(round2(realFinalAmount));
        result.setYearlyPoints(yearlyPoints);

        return result;
    }

    /**
     * 生成对比结论（不构成投资建议）
     */
    private List<String> generateInsights(List<ScenarioResult> results) {
        List<String> insights = new ArrayList<>();

        if (results.size() < 2) {
            return insights;
        }

        // 结论1：最优方案 vs 最差方案的差距
        ScenarioResult best = results.stream()
                .max(Comparator.comparingDouble(ScenarioResult::getRealFinalAmount))
                .orElse(null);
        ScenarioResult worst = results.stream()
                .min(Comparator.comparingDouble(ScenarioResult::getRealFinalAmount))
                .orElse(null);

        if (best != null && worst != null && best != worst) {
            double gap = best.getRealFinalAmount() - worst.getRealFinalAmount();
            insights.add(String.format(
                    "扣除通胀后，「%s」的实际购买力比「%s」高出约 %.0f 元。长期来看，看似微小的收益率差异会通过复利效应产生显著差距。",
                    best.getName(), worst.getName(), gap));
        }

        // 结论2：费率对收益的影响
        ScenarioResult highestFee = results.stream()
                .max(Comparator.comparingDouble(r -> {
                    // 这里我们比较 profitMultiple，低费率通常对应高倍数
                    return r.getProfitMultiple();
                }))
                .orElse(null);

        if (results.size() >= 2) {
            insights.add("费用率在长期复利中会不断侵蚀收益，相同收益率下费率越低的方案最终资产越高。");
        }

        // 结论3：定投效应
        long hasContribution = results.stream()
                .filter(r -> r.getTotalInvested() > 0)
                .count();
        if (hasContribution > 0) {
            insights.add("持续定投能够平滑市场波动，长期坚持比试图择时更可能获得接近预期的复利效果。");
        }

        // 最多保留3条
        if (insights.size() > 3) {
            return insights.subList(0, 3);
        }

        return insights;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double round4(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}
