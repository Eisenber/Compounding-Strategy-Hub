package com.example.compound.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CompareRequest {

    @NotNull(message = "方案列表不能为空")
    @Size(min = 2, max = 5, message = "方案数量必须在2到5个之间")
    @Valid
    private List<ScenarioInput> scenarios;

    public CompareRequest() {}

    public List<ScenarioInput> getScenarios() { return scenarios; }
    public void setScenarios(List<ScenarioInput> scenarios) { this.scenarios = scenarios; }
}
