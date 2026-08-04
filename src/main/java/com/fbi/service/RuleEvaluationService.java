package com.fbi.service;

import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.MonitoringRule;
import com.fbi.model.RuleType;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RuleEvaluationService {

    private final MonitoringRuleService monitoringRuleService;
    private final MonitoredTransactionRepository transactionRepository;
    private final AlertRepository alertRepository;

    public RuleEvaluationService(MonitoringRuleService monitoringRuleService, MonitoredTransactionRepository transactionRepository, AlertRepository alertRepository) {
        this.monitoringRuleService = monitoringRuleService;
        this.transactionRepository = transactionRepository;
        this.alertRepository = alertRepository;
    }

    public List<Alert> evaluateAndCreateAlerts(MonitoredTransaction transaction) {
        List<Alert> alerts = new ArrayList<>();
        for (MonitoringRule rule : monitoringRuleService.getActiveRules()) {
            if (isTriggered(rule, transaction)) {
                alerts.add(buildAlert(rule, transaction));
            }
        }
        return alertRepository.saveAll(alerts);
    }

    private boolean isTriggered(MonitoringRule rule, MonitoredTransaction transaction) {
        return switch (rule.getType()) {
            case AMOUNT_THRESHOLD -> transaction.getAmount().compareTo(rule.getAmountThreshold()) > 0;
            case VELOCITY -> isVelocityTriggered(rule, transaction);
            case NEW_PAYEE -> isNewPayeeTriggered(transaction);
            case DAILY_LIMIT -> isDailyLimitTriggered(rule, transaction);
            case SDN_MATCH -> false; // SDN screening handled in pre-save phase
        };
    }

    private boolean isVelocityTriggered(MonitoringRule rule, MonitoredTransaction transaction) {
        Instant from = transaction.getOccurredAt().minusSeconds(rule.getVelocityWindowMinutes() * 60L);
        long count = transactionRepository.countByAccountIdAndOccurredAtAfter(transaction.getAccountId(), from);
        return count > rule.getVelocityCount();
    }

    private boolean isNewPayeeTriggered(MonitoredTransaction transaction) {
        // Exclude the transaction's own row: it is already persisted by the time rule
        // evaluation runs (see TransactionService's two-phase pipeline), and timestamp
        // precision rounding on write can otherwise make it spuriously match itself as
        // "prior history", silently suppressing this alert for a genuinely new payee.
        return !transactionRepository.existsByAccountIdAndPayeeIdAndOccurredAtBeforeAndIdNot(
            transaction.getAccountId(),
            transaction.getPayeeId(),
            transaction.getOccurredAt(),
            transaction.getId()
        );
    }

    private boolean isDailyLimitTriggered(MonitoringRule rule, MonitoredTransaction transaction) {
        LocalDate date = transaction.getOccurredAt().atOffset(ZoneOffset.UTC).toLocalDate();
        Instant dayStart = date.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant nextDayStart = dayStart.plusSeconds(24L * 60L * 60L);
        BigDecimal total = transactionRepository.sumAmountForAccountBetween(transaction.getAccountId(), dayStart, nextDayStart);
        return total.compareTo(rule.getDailyLimit()) > 0;
    }

    private Alert buildAlert(MonitoringRule rule, MonitoredTransaction transaction) {
        Alert alert = new Alert();
        alert.setTransactionId(transaction.getId());
        alert.setAccountId(transaction.getAccountId());
        alert.setRuleId(rule.getId());
        alert.setRuleName(rule.getName());
        alert.setRuleType(rule.getType());
        alert.setSeverity(rule.getSeverity());
        alert.setStatus(AlertStatus.OPEN);
        alert.setMessage(buildMessage(rule.getType(), transaction));
        return alert;
    }

    private String buildMessage(RuleType type, MonitoredTransaction transaction) {
        return switch (type) {
            case AMOUNT_THRESHOLD -> "Amount threshold breached for transaction " + transaction.getId();
            case VELOCITY -> "Velocity rule triggered for account " + transaction.getAccountId();
            case NEW_PAYEE -> "New payee detected for account " + transaction.getAccountId();
            case DAILY_LIMIT -> "Daily limit exceeded for account " + transaction.getAccountId();
            case SDN_MATCH -> "SDN sanctions match for transaction " + transaction.getId();
        };
    }
}

