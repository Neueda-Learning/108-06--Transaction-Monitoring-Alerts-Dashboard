package com.fbi.dto;

import com.fbi.model.RuleType;
import com.fbi.model.Severity;

public record TransactionRuleResult(
    Long ruleId,
    String ruleName,
    RuleType ruleType,
    Severity severity,
    boolean triggered,
    String message
) {
}

