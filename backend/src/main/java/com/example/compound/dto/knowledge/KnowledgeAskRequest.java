package com.example.compound.dto.knowledge;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class KnowledgeAskRequest {

    @NotBlank(message = "question 不能为空")
    private String question;

    @Min(value = 1, message = "topK 至少为 1")
    @Max(value = 8, message = "topK 不能超过 8")
    private Integer topK = 5;

    private Boolean useGeneration = true;

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public Integer getTopK() {
        return topK;
    }

    public void setTopK(Integer topK) {
        this.topK = topK;
    }

    public Boolean getUseGeneration() {
        return useGeneration;
    }

    public void setUseGeneration(Boolean useGeneration) {
        this.useGeneration = useGeneration;
    }
}
