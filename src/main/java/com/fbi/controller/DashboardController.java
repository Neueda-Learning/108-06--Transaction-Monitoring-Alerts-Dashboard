package com.fbi.controller;

import com.fbi.dto.DashboardStatsResponse;
import com.fbi.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    @Operation(summary = "Get dashboard KPI statistics")
    public DashboardStatsResponse getStats(
        @RequestParam(required = false) Instant from,
        @RequestParam(required = false) Instant to
    ) {
        return dashboardService.getStats(from, to);
    }
}

