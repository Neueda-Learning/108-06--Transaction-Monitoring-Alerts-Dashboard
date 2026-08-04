package com.fbi.dto;

import com.fbi.model.AlertStatus;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

public record DashboardStatsResponse(
    Instant generatedAt,
    Window window,
    TransactionStats transactions,
    AlertStats alerts,
    RuleStats rules
) {

    public record Window(
        Instant from,
        Instant to
    ) {
    }

    public record TransactionStats(
        long totalCount,
        long windowCount,
        long flaggedOrBlockedCount,
        double flaggedOrBlockedRatePercent,
        BigDecimal totalVolume,
        BigDecimal windowVolume
    ) {
    }

    public record AlertStats(
        long totalCount,
        long windowCount,
        long openCount,
        Double averageResolutionHours,
        Map<AlertStatus, Long> byStatus,
        Map<Severity, Long> bySeverity,
        Map<RuleType, Long> byRuleType
    ) {
    }

    public record RuleStats(
        long totalCount,
        long activeCount
    ) {
    }
}

