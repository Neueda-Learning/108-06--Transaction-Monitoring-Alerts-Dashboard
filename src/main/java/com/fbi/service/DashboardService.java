package com.fbi.service;

import com.fbi.dto.DashboardStatsResponse;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.model.TransactionStatus;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import com.fbi.repository.MonitoringRuleRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final MonitoredTransactionRepository transactionRepository;
    private final AlertRepository alertRepository;
    private final MonitoringRuleRepository monitoringRuleRepository;

    public DashboardService(
        MonitoredTransactionRepository transactionRepository,
        AlertRepository alertRepository,
        MonitoringRuleRepository monitoringRuleRepository
    ) {
        this.transactionRepository = transactionRepository;
        this.alertRepository = alertRepository;
        this.monitoringRuleRepository = monitoringRuleRepository;
    }

    public DashboardStatsResponse getStats(Instant from, Instant to) {
        Instant windowTo = to != null ? to : Instant.now();
        Instant windowFrom = from != null ? from : windowTo.minus(Duration.ofHours(24));

        List<MonitoredTransaction> allTransactions = transactionRepository.findAll();
        List<Alert> allAlerts = alertRepository.findAll();

        List<MonitoredTransaction> windowTransactions = allTransactions.stream()
            .filter(tx -> isWithinWindow(tx.getOccurredAt(), windowFrom, windowTo))
            .toList();

        List<Alert> windowAlerts = allAlerts.stream()
            .filter(alert -> isWithinWindow(alert.getCreatedAt(), windowFrom, windowTo))
            .toList();

        long flaggedOrBlockedCount = allTransactions.stream()
            .filter(tx -> tx.getStatus() == TransactionStatus.FLAGGED || tx.getStatus() == TransactionStatus.BLOCKED)
            .count();

        BigDecimal totalVolume = allTransactions.stream()
            .map(MonitoredTransaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal windowVolume = windowTransactions.stream()
            .map(MonitoredTransaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        double flaggedRatePercent = percentage(flaggedOrBlockedCount, allTransactions.size());

        long openAlertCount = allAlerts.stream()
            .filter(alert -> alert.getStatus() != AlertStatus.CLOSED && alert.getStatus() != AlertStatus.DISMISSED)
            .count();

        Double averageResolutionHours = averageResolutionHours(allAlerts);

        Map<AlertStatus, Long> byStatus = countByAlertStatus(allAlerts);
        Map<Severity, Long> bySeverity = countBySeverity(allAlerts);
        Map<RuleType, Long> byRuleType = countByRuleType(allAlerts);

        DashboardStatsResponse.TransactionStats transactionStats = new DashboardStatsResponse.TransactionStats(
            allTransactions.size(),
            windowTransactions.size(),
            flaggedOrBlockedCount,
            flaggedRatePercent,
            totalVolume,
            windowVolume
        );

        DashboardStatsResponse.AlertStats alertStats = new DashboardStatsResponse.AlertStats(
            allAlerts.size(),
            windowAlerts.size(),
            openAlertCount,
            averageResolutionHours,
            byStatus,
            bySeverity,
            byRuleType
        );

        DashboardStatsResponse.RuleStats ruleStats = new DashboardStatsResponse.RuleStats(
            monitoringRuleRepository.count(),
            monitoringRuleRepository.findByActiveTrue().size()
        );

        return new DashboardStatsResponse(
            Instant.now(),
            new DashboardStatsResponse.Window(windowFrom, windowTo),
            transactionStats,
            alertStats,
            ruleStats
        );
    }

    private static boolean isWithinWindow(Instant value, Instant from, Instant to) {
        return value != null && !value.isBefore(from) && !value.isAfter(to);
    }

    private static double percentage(long numerator, long denominator) {
        if (denominator == 0) {
            return 0.0;
        }
        return BigDecimal.valueOf(numerator)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP)
            .doubleValue();
    }

    private static Double averageResolutionHours(List<Alert> alerts) {
        List<Long> resolvedDurationsSeconds = alerts.stream()
            .map(alert -> {
                Instant resolvedAt = alert.getClosedAt() != null ? alert.getClosedAt() : alert.getDismissedAt();
                if (alert.getCreatedAt() == null || resolvedAt == null) {
                    return null;
                }
                return Duration.between(alert.getCreatedAt(), resolvedAt).getSeconds();
            })
            .filter(seconds -> seconds != null && seconds >= 0)
            .toList();

        if (resolvedDurationsSeconds.isEmpty()) {
            return null;
        }

        double avgSeconds = resolvedDurationsSeconds.stream()
            .mapToLong(Long::longValue)
            .average()
            .orElse(0);

        return BigDecimal.valueOf(avgSeconds / 3600.0)
            .setScale(2, RoundingMode.HALF_UP)
            .doubleValue();
    }

    private static Map<AlertStatus, Long> countByAlertStatus(List<Alert> alerts) {
        Map<AlertStatus, Long> counts = new EnumMap<>(AlertStatus.class);
        Arrays.stream(AlertStatus.values()).forEach(status -> counts.put(status, 0L));
        alerts.forEach(alert -> counts.computeIfPresent(alert.getStatus(), (key, value) -> value + 1));
        return counts;
    }

    private static Map<Severity, Long> countBySeverity(List<Alert> alerts) {
        Map<Severity, Long> counts = new EnumMap<>(Severity.class);
        Arrays.stream(Severity.values()).forEach(severity -> counts.put(severity, 0L));
        alerts.forEach(alert -> counts.computeIfPresent(alert.getSeverity(), (key, value) -> value + 1));
        return counts;
    }

    private static Map<RuleType, Long> countByRuleType(List<Alert> alerts) {
        Map<RuleType, Long> counts = new EnumMap<>(RuleType.class);
        Arrays.stream(RuleType.values()).forEach(ruleType -> counts.put(ruleType, 0L));
        alerts.stream()
            .sorted(Comparator.comparing(Alert::getId))
            .forEach(alert -> counts.computeIfPresent(alert.getRuleType(), (key, value) -> value + 1));
        return counts;
    }
}

