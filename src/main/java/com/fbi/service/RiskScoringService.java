package com.fbi.service;

import com.fbi.model.Alert;
import com.fbi.model.Severity;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Computes a composite risk score (0-100) for a transaction from the
 * severities of the monitoring rule alerts it triggered.
 *
 * Formula: sum the weight of every triggered alert's severity, then cap the
 * total at {@link #MAX_SCORE}. A transaction with no triggered alerts scores
 * 0. SDN sanctions matches are handled separately by the caller and always
 * score the maximum, since a sanctions hit is the highest-risk event
 * regardless of anything else.
 *
 * A single concrete class is used here rather than an interface + impl
 * split: there is exactly one scoring algorithm in this project and no
 * second implementation planned, so an interface would add indirection
 * without a concrete second use — the same reasoning already applied to
 * skipping the Strategy pattern for the rule engine's switch expression.
 */
@Service
public class RiskScoringService {

    public static final int MAX_SCORE = 100;

    private static final Map<Severity, Integer> SEVERITY_WEIGHTS = Map.of(
        Severity.LOW, 15,
        Severity.MEDIUM, 35,
        Severity.HIGH, 60,
        Severity.CRITICAL, MAX_SCORE
    );

    public int calculateScore(List<Alert> triggeredAlerts) {
        int total = 0;
        for (Alert alert : triggeredAlerts) {
            total += SEVERITY_WEIGHTS.getOrDefault(alert.getSeverity(), 0);
        }
        return Math.min(total, MAX_SCORE);
    }
}
