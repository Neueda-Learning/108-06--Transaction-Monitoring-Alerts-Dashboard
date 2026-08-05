package com.fbi.controller;

import com.fbi.dto.AiDashboardSummaryResponse;
import com.fbi.dto.DashboardStatsResponse;
import com.fbi.service.DashboardAiSummaryService;
import com.fbi.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final DashboardAiSummaryService dashboardAiSummaryService;

    public DashboardController(DashboardService dashboardService, DashboardAiSummaryService dashboardAiSummaryService) {
        this.dashboardService = dashboardService;
        this.dashboardAiSummaryService = dashboardAiSummaryService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard KPI statistics")
    public DashboardStatsResponse getStats(
        @RequestParam(required = false) Instant from,
        @RequestParam(required = false) Instant to
    ) {
        return dashboardService.getStats(from, to);
    }

    @PostMapping("/ai-summary")
    @Operation(summary = "Generate an AI-assisted narrative summary of dashboard activity")
    public AiDashboardSummaryResponse aiSummary() {
        return dashboardAiSummaryService.generateSummary();
    }
}

