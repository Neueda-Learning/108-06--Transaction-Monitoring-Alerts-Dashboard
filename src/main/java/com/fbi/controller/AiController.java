package com.fbi.controller;

import com.fbi.dto.AiInvestigationResponse;
import com.fbi.service.InvestigationAgentService;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/alerts")
public class AiController {

    private final InvestigationAgentService investigationAgentService;

    public AiController(InvestigationAgentService investigationAgentService) {
        this.investigationAgentService = investigationAgentService;
    }

    @PostMapping("/{id}/ai-investigate")
    @Operation(summary = "Generate an AI-assisted investigation summary and recommendation for an alert")
    public AiInvestigationResponse aiInvestigate(@PathVariable Long id) {
        return investigationAgentService.investigate(id);
    }
}
