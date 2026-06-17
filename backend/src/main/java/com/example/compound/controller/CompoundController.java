package com.example.compound.controller;

import com.example.compound.dto.CompareRequest;
import com.example.compound.dto.CompareResponse;
import com.example.compound.service.CompoundService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/compound")
public class CompoundController {

    private final CompoundService compoundService;

    public CompoundController(CompoundService compoundService) {
        this.compoundService = compoundService;
    }

    @PostMapping("/compare")
    public CompareResponse compare(@Valid @RequestBody CompareRequest request) {
        return compoundService.compare(request);
    }
}
