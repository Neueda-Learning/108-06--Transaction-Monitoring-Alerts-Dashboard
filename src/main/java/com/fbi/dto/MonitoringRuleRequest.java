package com.fbi.dto;

import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record MonitoringRuleRequest(
    @NotBlank String name,
    @NotNull RuleType type,
    @NotNull Severity severity,
    boolean active,
    BigDecimal amountThreshold,
    Integer velocityCount,
    Integer velocityWindowMinutes,
    BigDecimal dailyLimit
) {
}

