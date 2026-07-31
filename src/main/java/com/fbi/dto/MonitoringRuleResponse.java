package com.fbi.dto;

import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import java.math.BigDecimal;

public record MonitoringRuleResponse(
    Long id,
    String name,
    RuleType type,
    Severity severity,
    boolean active,
    BigDecimal amountThreshold,
    Integer velocityCount,
    Integer velocityWindowMinutes,
    BigDecimal dailyLimit
) {
}

