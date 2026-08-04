package com.fbi.service;

import com.fbi.model.Alert;
import com.fbi.model.Severity;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the composite risk scoring formula: sum of triggered
 * alert severity weights, capped at 100.
 */
class RiskScoringServiceTest {

    private final RiskScoringService riskScoringService = new RiskScoringService();

    private Alert alertWithSeverity(Severity severity) {
        Alert alert = new Alert();
        alert.setSeverity(severity);
        return alert;
    }

    @Test
    void noTriggeredAlerts_scoresZero() {
        assertThat(riskScoringService.calculateScore(List.of())).isZero();
    }

    @Test
    void singleLowSeverityAlert_scoresItsWeight() {
        assertThat(riskScoringService.calculateScore(List.of(alertWithSeverity(Severity.LOW)))).isEqualTo(15);
    }

    @Test
    void singleMediumSeverityAlert_scoresItsWeight() {
        assertThat(riskScoringService.calculateScore(List.of(alertWithSeverity(Severity.MEDIUM)))).isEqualTo(35);
    }

    @Test
    void singleHighSeverityAlert_scoresItsWeight() {
        assertThat(riskScoringService.calculateScore(List.of(alertWithSeverity(Severity.HIGH)))).isEqualTo(60);
    }

    @Test
    void criticalSeverityAlert_scoresMax() {
        assertThat(riskScoringService.calculateScore(List.of(alertWithSeverity(Severity.CRITICAL)))).isEqualTo(100);
    }

    @Test
    void multipleAlerts_areSummedAndCapped() {
        List<Alert> alerts = List.of(
            alertWithSeverity(Severity.MEDIUM),
            alertWithSeverity(Severity.HIGH)
        );
        // 35 + 60 = 95, under the cap
        assertThat(riskScoringService.calculateScore(alerts)).isEqualTo(95);
    }

    @Test
    void combinedWeightsExceedingMax_areCappedAt100() {
        List<Alert> alerts = List.of(
            alertWithSeverity(Severity.HIGH),
            alertWithSeverity(Severity.HIGH)
        );
        // 60 + 60 = 120, capped to 100
        assertThat(riskScoringService.calculateScore(alerts)).isEqualTo(100);
    }
}
