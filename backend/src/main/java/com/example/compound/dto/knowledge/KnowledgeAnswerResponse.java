package com.example.compound.dto.knowledge;

import java.time.LocalDateTime;
import java.util.List;

public class KnowledgeAnswerResponse {

    private String question;
    private String answer;
    private String mode;
    private boolean generationAvailable;
    private int indexedDocumentCount;
    private int indexedChunkCount;
    private LocalDateTime generatedAt;
    private List<KnowledgeSourceDto> sources;

    public String getQuestion() {
        return question;
    }

    public void setQuestion(String question) {
        this.question = question;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public boolean isGenerationAvailable() {
        return generationAvailable;
    }

    public void setGenerationAvailable(boolean generationAvailable) {
        this.generationAvailable = generationAvailable;
    }

    public int getIndexedDocumentCount() {
        return indexedDocumentCount;
    }

    public void setIndexedDocumentCount(int indexedDocumentCount) {
        this.indexedDocumentCount = indexedDocumentCount;
    }

    public int getIndexedChunkCount() {
        return indexedChunkCount;
    }

    public void setIndexedChunkCount(int indexedChunkCount) {
        this.indexedChunkCount = indexedChunkCount;
    }

    public LocalDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(LocalDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public List<KnowledgeSourceDto> getSources() {
        return sources;
    }

    public void setSources(List<KnowledgeSourceDto> sources) {
        this.sources = sources;
    }
}
