package com.example.compound.dto;

import jakarta.validation.constraints.*;

public class ScenarioInput {

    @NotBlank(message = "方案名称不能为空")
    private String name;

    @NotNull(message = "初始本金不能为空")
    @DecimalMin(value = "0.0", inclusive = true, message = "初始本金不能为负数")
    @DecimalMax(value = "100000000.0", message = "初始本金不能超过1亿")
    private Double initialPrincipal;

    @NotNull(message = "每月定投金额不能为空")
    @DecimalMin(value = "0.0", inclusive = true, message = "每月定投金额不能为负数")
    @DecimalMax(value = "10000000.0", message = "每月定投金额不能超过1000万")
    private Double monthlyContribution;

    @NotNull(message = "投资年限不能为空")
    @Min(value = 1, message = "投资年限至少为1年")
    @Max(value = 50, message = "投资年限最多为50年")
    private Integer years;

    @NotNull(message = "预期年化收益率不能为空")
    @DecimalMin(value = "0.0", message = "预期年化收益率不能为负数")
    @DecimalMax(value = "1.0", message = "预期年化收益率不能超过100%")
    private Double annualReturnRate;

    @NotNull(message = "年费率不能为空")
    @DecimalMin(value = "0.0", inclusive = true, message = "年费率不能为负数")
    @DecimalMax(value = "0.1", message = "年费率不能超过10%")
    private Double annualFeeRate;

    @NotNull(message = "通胀率不能为空")
    @DecimalMin(value = "0.0", inclusive = true, message = "通胀率不能为负数")
    @DecimalMax(value = "0.2", message = "通胀率不能超过20%")
    private Double inflationRate;

    public ScenarioInput() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Double getInitialPrincipal() { return initialPrincipal; }
    public void setInitialPrincipal(Double initialPrincipal) { this.initialPrincipal = initialPrincipal; }

    public Double getMonthlyContribution() { return monthlyContribution; }
    public void setMonthlyContribution(Double monthlyContribution) { this.monthlyContribution = monthlyContribution; }

    public Integer getYears() { return years; }
    public void setYears(Integer years) { this.years = years; }

    public Double getAnnualReturnRate() { return annualReturnRate; }
    public void setAnnualReturnRate(Double annualReturnRate) { this.annualReturnRate = annualReturnRate; }

    public Double getAnnualFeeRate() { return annualFeeRate; }
    public void setAnnualFeeRate(Double annualFeeRate) { this.annualFeeRate = annualFeeRate; }

    public Double getInflationRate() { return inflationRate; }
    public void setInflationRate(Double inflationRate) { this.inflationRate = inflationRate; }
}
