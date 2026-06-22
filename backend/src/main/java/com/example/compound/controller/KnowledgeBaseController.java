package com.example.compound.controller;

import com.example.compound.dto.knowledge.KnowledgeAnswerResponse;
import com.example.compound.dto.knowledge.KnowledgeAskRequest;
import com.example.compound.dto.knowledge.KnowledgeReindexResponse;
import com.example.compound.service.knowledge.KnowledgeBaseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/knowledge")
public class KnowledgeBaseController {

    private final KnowledgeBaseService knowledgeBaseService;

    public KnowledgeBaseController(KnowledgeBaseService knowledgeBaseService) {
        this.knowledgeBaseService = knowledgeBaseService;
    }

    @PostMapping("/ask")
    public ResponseEntity<KnowledgeAnswerResponse> ask(@Valid @RequestBody KnowledgeAskRequest request) {
        return ResponseEntity.ok(knowledgeBaseService.ask(request));
    }

    @PostMapping("/reindex")
    public ResponseEntity<KnowledgeReindexResponse> reindex() {
        return ResponseEntity.ok(knowledgeBaseService.rebuildIndex());
    }
}
