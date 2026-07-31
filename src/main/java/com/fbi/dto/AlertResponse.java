package com.fbi.dto;

import com.fbi.model.AlertStatus;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import java.time.Instant;

public record AlertResponse(
    Long id,
    Long transactionId,
    String accountId,
    Long ruleId,
    String ruleName,
    RuleType ruleType,
    Severity severity,
    AlertStatus status,
    String message,
    String lifecycleNote,
    Instant createdAt,
    Instant acknowledgedAt,
    Instant investigatingAt,
    Instant closedAt,
    Instant dismissedAt
) {
}

