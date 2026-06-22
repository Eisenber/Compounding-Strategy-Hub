package com.example.compound.service.knowledge;

import java.util.List;

record KnowledgeChunk(
        String title,
        String path,
        String content,
        String normalizedContent,
        String normalizedPath,
        List<String> tokens
) {
}
