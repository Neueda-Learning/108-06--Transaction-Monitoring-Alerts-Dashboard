package com.fbi.dto;

import java.time.Instant;
import java.util.List;

public record AiInvestigationResponse(
    Long alertId,
    String riskLevel,
    String summary,
    String recommendation,
    List<String> keyFindings,
    String model,
    Instant generatedAt
) {
}
