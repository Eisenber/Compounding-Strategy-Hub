package com.example.compound.service.knowledge;

import java.util.List;
import java.util.Optional;

interface KnowledgeAnswerGenerator {
    Optional<String> generate(String question, List<KnowledgeChunkSearchResult> sources);
}
