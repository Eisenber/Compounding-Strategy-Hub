package com.example.compound.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @GetMapping("/")
    public Map<String, Object> root() {
        return Map.of(
            "app", "复利选股 API",
            "version", "2.0",
            "endpoints", Map.of(
                "health", "/api/health",
                "strategies", "/api/v2/strategies",
                "screen", "POST /api/v2/strategies/screen"
            )
        );
    }
}
