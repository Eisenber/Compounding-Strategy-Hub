package com.example.compound.dto.knowledge;

import java.time.LocalDateTime;
import java.util.List;

public class KnowledgeReindexResponse {

    private int indexedDocumentCount;
    private int indexedChunkCount;
    private LocalDateTime rebuiltAt;
    private List<String> sourcePaths;

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

    public LocalDateTime getRebuiltAt() {
        return rebuiltAt;
    }

    public void setRebuiltAt(LocalDateTime rebuiltAt) {
        this.rebuiltAt = rebuiltAt;
    }

    public List<String> getSourcePaths() {
        return sourcePaths;
    }

    public void setSourcePaths(List<String> sourcePaths) {
        this.sourcePaths = sourcePaths;
    }
}
