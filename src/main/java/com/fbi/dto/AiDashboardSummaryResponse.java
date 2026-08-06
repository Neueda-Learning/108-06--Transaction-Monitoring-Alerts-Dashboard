package com.fbi.dto;

import java.time.Instant;
import java.util.List;

public record AiDashboardSummaryResponse(
    Instant generatedAt,
    String narrative,
    List<String> insights,
    List<ActionStep> actionSteps,
    String model
) {

    public record ActionStep(
        String priority,
        String title,
        List<String> details
    ) {
    }
}
