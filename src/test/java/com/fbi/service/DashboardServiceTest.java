package com.fbi.service;

import com.fbi.dto.DashboardStatsResponse;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.MonitoringRule;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.model.TransactionStatus;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import com.fbi.repository.MonitoringRuleRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private MonitoredTransactionRepository transactionRepository;
    @Mock
    private AlertRepository alertRepository;
    @Mock
    private MonitoringRuleRepository monitoringRuleRepository;

    private DashboardService dashboardService;

    @BeforeEach
    void setUp() {
        dashboardService = new DashboardService(transactionRepository, alertRepository, monitoringRuleRepository);
    }

    private MonitoredTransaction transaction(BigDecimal amount, TransactionStatus status, Instant occurredAt) {
        MonitoredTransaction transaction = new MonitoredTransaction();
        transaction.setAmount(amount);
        transaction.setStatus(status);
        transaction.setOccurredAt(occurredAt);
        return transaction;
    }

    private Alert alert(Long id, AlertStatus status, Severity severity, RuleType ruleType, Instant createdAt, Instant closedAt, Instant dismissedAt) {
        Alert alert = new Alert();
        alert.setId(id);
        alert.setStatus(status);
        alert.setSeverity(severity);
        alert.setRuleType(ruleType);
        alert.setCreatedAt(createdAt);
        alert.setClosedAt(closedAt);
        alert.setDismissedAt(dismissedAt);
        return alert;
    }

    @Test
    void getStats_computesTransactionAndAlertAggregates() {
        Instant now = Instant.now();
        Instant windowStart = now.minusSeconds(3600);

        MonitoredTransaction inWindow = transaction(new BigDecimal("100.00"), TransactionStatus.APPROVED, now.minusSeconds(1800));
        MonitoredTransaction outOfWindow = transaction(new BigDecimal("500.00"), TransactionStatus.FLAGGED, now.minusSeconds(90000));
        when(transactionRepository.findAll()).thenReturn(List.of(inWindow, outOfWindow));

        Alert openAlert = alert(1L, AlertStatus.OPEN, Severity.HIGH, RuleType.AMOUNT_THRESHOLD, now.minusSeconds(1800), null, null);
        Alert resolvedAlert = alert(2L, AlertStatus.CLOSED, Severity.MEDIUM, RuleType.VELOCITY, now.minusSeconds(7200), now.minusSeconds(3600), null);
        when(alertRepository.findAll()).thenReturn(List.of(openAlert, resolvedAlert));

        when(monitoringRuleRepository.count()).thenReturn(4L);
        when(monitoringRuleRepository.findByActiveTrue()).thenReturn(List.of(new MonitoringRule()));

        DashboardStatsResponse response = dashboardService.getStats(windowStart, now);

        assertThat(response.transactions().totalCount()).isEqualTo(2);
        assertThat(response.transactions().windowCount()).isEqualTo(1);
        assertThat(response.transactions().flaggedOrBlockedCount()).isEqualTo(1);
        assertThat(response.transactions().flaggedOrBlockedRatePercent()).isEqualTo(50.0);
        assertThat(response.transactions().totalVolume()).isEqualByComparingTo("600.00");

        assertThat(response.alerts().totalCount()).isEqualTo(2);
        assertThat(response.alerts().openCount()).isEqualTo(1);
        assertThat(response.alerts().byStatus().get(AlertStatus.OPEN)).isEqualTo(1L);
        assertThat(response.alerts().byStatus().get(AlertStatus.CLOSED)).isEqualTo(1L);
        assertThat(response.alerts().bySeverity().get(Severity.HIGH)).isEqualTo(1L);
        assertThat(response.alerts().byRuleType().get(RuleType.AMOUNT_THRESHOLD)).isEqualTo(1L);
        assertThat(response.alerts().averageResolutionHours()).isEqualTo(1.0);

        assertThat(response.rules().totalCount()).isEqualTo(4L);
        assertThat(response.rules().activeCount()).isEqualTo(1);
    }

    @Test
    void getStats_defaultsWindowWhenNotProvided() {
        when(transactionRepository.findAll()).thenReturn(List.of());
        when(alertRepository.findAll()).thenReturn(List.of());
        when(monitoringRuleRepository.count()).thenReturn(0L);
        when(monitoringRuleRepository.findByActiveTrue()).thenReturn(List.of());

        DashboardStatsResponse response = dashboardService.getStats(null, null);

        assertThat(response.window().from()).isBefore(response.window().to());
        assertThat(response.transactions().totalCount()).isZero();
        assertThat(response.transactions().flaggedOrBlockedRatePercent()).isZero();
        assertThat(response.alerts().averageResolutionHours()).isNull();
    }

    @Test
    void getStats_noResolvedAlerts_averageResolutionIsNull() {
        Alert openAlert = alert(1L, AlertStatus.OPEN, Severity.LOW, RuleType.NEW_PAYEE, Instant.now(), null, null);
        when(transactionRepository.findAll()).thenReturn(List.of());
        when(alertRepository.findAll()).thenReturn(List.of(openAlert));
        when(monitoringRuleRepository.count()).thenReturn(1L);
        when(monitoringRuleRepository.findByActiveTrue()).thenReturn(List.of());

        DashboardStatsResponse response = dashboardService.getStats(null, null);

        assertThat(response.alerts().averageResolutionHours()).isNull();
    }

    @Test
    void getStats_dismissedAlertCountsAsResolved() {
        Instant now = Instant.now();
        Alert dismissed = alert(3L, AlertStatus.DISMISSED, Severity.LOW, RuleType.NEW_PAYEE, now.minusSeconds(7200), null, now.minusSeconds(3600));
        when(transactionRepository.findAll()).thenReturn(List.of());
        when(alertRepository.findAll()).thenReturn(List.of(dismissed));
        when(monitoringRuleRepository.count()).thenReturn(1L);
        when(monitoringRuleRepository.findByActiveTrue()).thenReturn(List.of());

        DashboardStatsResponse response = dashboardService.getStats(null, null);

        assertThat(response.alerts().averageResolutionHours()).isEqualTo(1.0);
        assertThat(response.alerts().openCount()).isZero();
    }
}
