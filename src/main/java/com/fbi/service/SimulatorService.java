package com.fbi.service;

import com.fbi.dto.SimulationResult;
import com.fbi.dto.TransactionCreateRequest;
import com.fbi.exception.BadRequestException;
import com.fbi.model.Alert;
import com.fbi.model.MonitoredTransaction;
import com.fbi.repository.AlertRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Generates realistic preset transaction sequences that exercise every monitoring
 * rule (amount threshold, velocity, new payee, daily limit, SDN sanctions match)
 * for demo purposes. Each scenario uses a freshly generated account/payee so runs
 * don't interfere with each other or with manually entered demo data.
 */
@Service
public class SimulatorService {

    public static final Map<String, String> SCENARIOS = new LinkedHashMap<>();

    static {
        SCENARIOS.put("clean", "A normal, low-value transaction that should be approved without any alerts.");
        SCENARIOS.put("amount-threshold", "A single transaction above the $10,000 amount threshold.");
        SCENARIOS.put("velocity-burst", "Six rapid transactions from the same account, triggering the velocity rule (>5 in 10 minutes).");
        SCENARIOS.put("new-payee", "A transaction to a payee the account has never paid before.");
        SCENARIOS.put("daily-limit", "Six transactions in one day, each below the amount threshold, whose cumulative total breaches the $50,000 daily limit.");
        SCENARIOS.put("sdn-match", "A transaction to a payee name matching an OFAC SDN sanctions list entry - blocked immediately.");
    }

    private final TransactionService transactionService;
    private final AlertRepository alertRepository;
    private final MonitoringRuleService monitoringRuleService;

    public SimulatorService(TransactionService transactionService, AlertRepository alertRepository, MonitoringRuleService monitoringRuleService) {
        this.transactionService = transactionService;
        this.alertRepository = alertRepository;
        this.monitoringRuleService = monitoringRuleService;
    }

    public SimulationResult runScenario(String scenario) {
        if (!SCENARIOS.containsKey(scenario)) {
            throw new BadRequestException("Unknown simulator scenario: " + scenario);
        }

        return switch (scenario) {
            case "clean" -> runClean();
            case "amount-threshold" -> runAmountThreshold();
            case "velocity-burst" -> runVelocityBurst();
            case "new-payee" -> runNewPayee();
            case "daily-limit" -> runDailyLimit();
            case "sdn-match" -> runSdnMatch();
            default -> throw new BadRequestException("Unknown simulator scenario: " + scenario);
        };
    }

    private SimulationResult runClean() {
        String account = randomAccountId();
        String payee = "COFFEE-SHOP-42";
        // Establish prior history so this account/payee pair is not "new" - a brand
        // new account's very first transaction always trips NEW_PAYEE by definition,
        // which would make a truly alert-free demo transaction impossible otherwise.
        createTransactionAt(account, payee, "Everyday Coffee Co", new BigDecimal("3.75"),
            "Prior established history (seed)", Instant.now().minus(1, ChronoUnit.DAYS));
        MonitoredTransaction txn = createTransaction(account, payee, "Everyday Coffee Co", new BigDecimal("4.50"), "Routine low-value purchase");
        return buildResult("clean", List.of(txn));
    }

    private SimulationResult runAmountThreshold() {
        String account = randomAccountId();
        // Find the highest amount threshold from all active AMOUNT_THRESHOLD rules
        BigDecimal maxThreshold = monitoringRuleService.getActiveRules().stream()
            .filter(rule -> rule.getType() == com.fbi.model.RuleType.AMOUNT_THRESHOLD)
            .map(rule -> rule.getAmountThreshold())
            .filter(threshold -> threshold != null)
            .max(BigDecimal::compareTo)
            .orElse(new BigDecimal("10000.00"));
        
        // Create a transaction slightly above the threshold to trigger it
        BigDecimal amount = maxThreshold.multiply(new BigDecimal("1.5"));
        MonitoredTransaction txn = createTransaction(account, randomPayeeId(), "International Wire Recipient", amount, "High amount threshold breach");
        return buildResult("amount-threshold", List.of(txn));
    }

    private SimulationResult runVelocityBurst() {
        String account = randomAccountId();
        String payee = randomPayeeId();
        // Find the highest velocity count from all active VELOCITY rules
        int maxVelocityCount = monitoringRuleService.getActiveRules().stream()
            .filter(rule -> rule.getType() == com.fbi.model.RuleType.VELOCITY)
            .map(rule -> rule.getVelocityCount())
            .filter(count -> count != null)
            .max(Integer::compareTo)
            .orElse(5);
        
        // Create count+1 transactions to trigger the rule
        List<MonitoredTransaction> transactions = new ArrayList<>();
        int transactionCount = maxVelocityCount + 1;
        for (int i = 1; i <= transactionCount; i++) {
            transactions.add(createTransaction(account, payee, "Rapid Transfer Recipient",
                new BigDecimal("500.00"), "Velocity burst transaction " + i + " of " + transactionCount));
        }
        return buildResult("velocity-burst", transactions);
    }

    private SimulationResult runNewPayee() {
        String account = randomAccountId();
        MonitoredTransaction txn = createTransaction(account, randomPayeeId(), "First-Time Recipient", new BigDecimal("1250.00"), "First-time payee scenario");
        return buildResult("new-payee", List.of(txn));
    }

    private SimulationResult runDailyLimit() {
        String account = randomAccountId();
        String payee = randomPayeeId();
        // Find the highest daily limit from all active DAILY_LIMIT rules
        BigDecimal maxDailyLimit = monitoringRuleService.getActiveRules().stream()
            .filter(rule -> rule.getType() == com.fbi.model.RuleType.DAILY_LIMIT)
            .map(rule -> rule.getDailyLimit())
            .filter(limit -> limit != null)
            .max(BigDecimal::compareTo)
            .orElse(new BigDecimal("50000.00"));
        
        // Create 6 transactions that together exceed the daily limit
        // Each transaction is slightly above 1/5 of the limit to ensure total exceeds it
        BigDecimal perTransactionAmount = maxDailyLimit.divide(new BigDecimal("5"), 2, java.math.RoundingMode.HALF_UP);
        
        // Spread transactions ~2 hours apart across the same day so the velocity rule's
        // 10-minute window never spans more than one transaction - keeping this scenario
        // a clean demonstration of the daily cumulative limit rule on its own.
        Instant start = java.time.LocalDate.now(java.time.ZoneOffset.UTC)
            .atStartOfDay(java.time.ZoneOffset.UTC).toInstant().plus(1, ChronoUnit.HOURS);
        List<MonitoredTransaction> transactions = new ArrayList<>();
        for (int i = 1; i <= 6; i++) {
            Instant occurredAt = start.plus((i - 1) * 2L, ChronoUnit.HOURS);
            transactions.add(createTransactionAt(account, payee, "Daily Limit Recipient",
                perTransactionAmount, "Daily cumulative limit pressure " + i + " of 6", occurredAt));
        }
        return buildResult("daily-limit", transactions);
    }

    private SimulationResult runSdnMatch() {
        String account = randomAccountId();
        MonitoredTransaction txn = createTransaction(account, randomPayeeId(), "Viktor Petrov", new BigDecimal("2500.00"), "OFAC SDN sanctions match scenario");
        return buildResult("sdn-match", List.of(txn));
    }

    private MonitoredTransaction createTransaction(String accountId, String payeeId, String payeeName, BigDecimal amount, String description) {
        return createTransactionAt(accountId, payeeId, payeeName, amount, description, Instant.now());
    }

    private MonitoredTransaction createTransactionAt(String accountId, String payeeId, String payeeName, BigDecimal amount, String description, Instant occurredAt) {
        TransactionCreateRequest request = new TransactionCreateRequest(
            accountId,
            payeeId,
            payeeName,
            amount,
            "USD",
            null,
            occurredAt,
            description
        );
        return transactionService.createTransaction(request);
    }

    private SimulationResult buildResult(String scenario, List<MonitoredTransaction> transactions) {
        List<Long> ids = transactions.stream().map(MonitoredTransaction::getId).toList();
        List<Alert> alerts = alertRepository.findByTransactionIdIn(ids);

        return new SimulationResult(
            scenario,
            SCENARIOS.get(scenario),
            transactions.stream().map(ApiMapper::toResponse).toList(),
            alerts.stream().map(ApiMapper::toResponse).toList()
        );
    }

    private String randomAccountId() {
        return "SIM-ACC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }

    private String randomPayeeId() {
        return "SIM-PAYEE-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
