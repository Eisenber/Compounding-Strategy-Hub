package com.example.compound.dto.v2;

/**
 * 策略模板列表项 — 用于 GET /api/v2/strategies/templates 响应
 */
public class StrategyTemplateDto {

    private String code;
    private String name;
    private String description;

    public StrategyTemplateDto() {}

    public StrategyTemplateDto(String code, String name, String description) {
        this.code = code;
        this.name = name;
        this.description = description;
    }

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
