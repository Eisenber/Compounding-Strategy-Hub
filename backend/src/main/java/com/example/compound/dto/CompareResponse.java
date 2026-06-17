package com.example.compound.dto;

import java.util.List;

public class CompareResponse {

    private String bestScenarioName;
    private List<ScenarioResult> scenarios;
    private List<String> insights;

    public CompareResponse() {}

    public String getBestScenarioName() { return bestScenarioName; }
    public void setBestScenarioName(String bestScenarioName) { this.bestScenarioName = bestScenarioName; }

    public List<ScenarioResult> getScenarios() { return scenarios; }
    public void setScenarios(List<ScenarioResult> scenarios) { this.scenarios = scenarios; }

    public List<String> getInsights() { return insights; }
    public void setInsights(List<String> insights) { this.insights = insights; }
}
