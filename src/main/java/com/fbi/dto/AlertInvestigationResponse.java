package com.fbi.dto;

import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import java.time.Instant;
import java.util.List;

public record AlertInvestigationResponse(
    Long alertId,
    AlertStatus currentStatus,
    Severity severity,
    String riskLevel,
    String summary,
    List<String> keyFindings,
    int noteCount,
    Instant generatedAt,
    boolean persistedToLifecycleNote
) {
}

