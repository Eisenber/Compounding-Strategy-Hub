package com.example.compound.dto.v2;

import java.util.Map;

/**
 * 策略模板详情 — 用于 GET /api/v2/strategies/templates/{code} 响应
 */
public class TemplateDetailDto {

    private String code;
    private String name;
    private Map<String, Object> filters;
    private String explanation;
    private String riskNote;

    public TemplateDetailDto() {}

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Map<String, Object> getFilters() {
        return filters;
    }

    public void setFilters(Map<String, Object> filters) {
        this.filters = filters;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getRiskNote() {
        return riskNote;
    }

    public void setRiskNote(String riskNote) {
        this.riskNote = riskNote;
    }
}
