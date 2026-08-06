package com.fbi.service;

import com.fbi.dto.TransactionCreateRequest;
import com.fbi.dto.TransactionRuleResult;
import com.fbi.exception.NotFoundException;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.model.TransactionStatus;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import com.fbi.repository.MonitoringRuleRepository;
import com.fbi.service.SdnScreeningService.SdnMatchResult;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionService.class);

    private final MonitoredTransactionRepository transactionRepository;
    private final RuleEvaluationService ruleEvaluationService;
    private final SdnScreeningService sdnScreeningService;
    private final AlertRepository alertRepository;
    private final MonitoringRuleRepository monitoringRuleRepository;
    private final RiskScoringService riskScoringService;

    public TransactionService(
            MonitoredTransactionRepository transactionRepository,
            RuleEvaluationService ruleEvaluationService,
            SdnScreeningService sdnScreeningService,
            AlertRepository alertRepository,
            MonitoringRuleRepository monitoringRuleRepository,
            RiskScoringService riskScoringService) {
        this.transactionRepository = transactionRepository;
        this.ruleEvaluationService = ruleEvaluationService;
        this.sdnScreeningService = sdnScreeningService;
        this.alertRepository = alertRepository;
        this.monitoringRuleRepository = monitoringRuleRepository;
        this.riskScoringService = riskScoringService;
    }

    /**
     * Two-phase transaction processing pipeline:
     *
     * Phase 1 (pre-save): Screen payee name against OFAC SDN list.
     *   - If match found: save as BLOCKED, create CRITICAL alert, return immediately.
     *
     * Phase 2 (post-save): Evaluate AML monitoring rules.
     *   - If rules trigger: set status to FLAGGED.
     *   - If no rules trigger: set status to APPROVED.
     */
    public MonitoredTransaction createTransaction(TransactionCreateRequest request) {
        MonitoredTransaction transaction = new MonitoredTransaction();
        transaction.setAccountId(request.accountId());
        transaction.setPayeeId(request.payeeId());
        transaction.setPayeeName(request.payeeName() != null ? request.payeeName() : request.payeeId());
        transaction.setAmount(request.amount());
        transaction.setCurrency(request.currency().toUpperCase());
        transaction.setCountry(request.country());
        transaction.setOccurredAt(request.occurredAt());
        transaction.setDescription(request.description());

        // === PHASE 1: SDN Screening (pre-save) ===
        SdnMatchResult sdnMatch = sdnScreeningService.screen(transaction.getPayeeName());

        if (sdnMatch != null) {
            log.warn("SDN MATCH DETECTED: payee '{}' matched '{}' (score: {})",
                    transaction.getPayeeName(), sdnMatch.matchedEntry().name(), sdnMatch.score());

            transaction.setStatus(TransactionStatus.BLOCKED);
            // A sanctions match is always the maximum-risk event, regardless of any
            // other rule signal, so it short-circuits straight to the top score.
            transaction.setRiskScore(RiskScoringService.MAX_SCORE);
            MonitoredTransaction blocked = transactionRepository.save(transaction);

            // Create a CRITICAL alert for the SDN match
            Alert alert = new Alert();
            alert.setTransactionId(blocked.getId());
            alert.setAccountId(blocked.getAccountId());
            alert.setRuleId(0L);
            alert.setRuleName("SDN Sanctions Screening");
            alert.setRuleType(RuleType.SDN_MATCH);
            alert.setSeverity(Severity.CRITICAL);
            alert.setStatus(AlertStatus.OPEN);
            alert.setMessage(String.format(
                    "BLOCKED: Payee '%s' matched SDN entry '%s' (ID: %d, %s) with %.0f%% confidence",
                    blocked.getPayeeName(),
                    sdnMatch.matchedEntry().name(),
                    sdnMatch.matchedEntry().id(),
                    sdnMatch.matchedEntry().country(),
                    sdnMatch.score() * 100));
            alertRepository.save(alert);

            return blocked;
        }

        // === PHASE 2: Rule Evaluation (post-save) ===
        MonitoredTransaction saved = transactionRepository.save(transaction);
        List<Alert> alerts = ruleEvaluationService.evaluateAndCreateAlerts(saved);

        if (!alerts.isEmpty()) {
            saved.setStatus(TransactionStatus.FLAGGED);
        } else {
            saved.setStatus(TransactionStatus.APPROVED);
        }
        saved.setRiskScore(riskScoringService.calculateScore(alerts));
        transactionRepository.save(saved);

        return saved;
    }

    public MonitoredTransaction getById(Long id) {
        return transactionRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Transaction not found: " + id));
    }

    public List<TransactionRuleResult> getRuleResults(Long transactionId) {
        getById(transactionId);

        Map<Long, Alert> alertByRuleId = alertRepository.findByTransactionId(transactionId)
            .stream()
            .filter(alert -> alert.getRuleId() != null)
            .collect(Collectors.toMap(Alert::getRuleId, Function.identity(), (left, right) -> left));

        return monitoringRuleRepository.findAll().stream()
            .map(rule -> {
                Alert alert = alertByRuleId.get(rule.getId());
                boolean triggered = alert != null;
                String message = triggered ? alert.getMessage() : "Rule not triggered for this transaction";
                return new TransactionRuleResult(
                    rule.getId(),
                    rule.getName(),
                    rule.getType(),
                    rule.getSeverity(),
                    triggered,
                    message
                );
            })
            .toList();
    }

    public List<MonitoredTransaction> search(
        String accountId,
        String payeeId,
        TransactionStatus status,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Instant from,
        Instant to
    ) {
        return transactionRepository.findAll(buildSearchSpecification(accountId, payeeId, status, null, minAmount, maxAmount, from, to));
    }

    public Page<MonitoredTransaction> searchPaged(
        String accountId,
        String payeeId,
        TransactionStatus status,
        String search,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Instant from,
        Instant to,
        Pageable pageable
    ) {
        return transactionRepository.findAll(
            buildSearchSpecification(accountId, payeeId, status, search, minAmount, maxAmount, from, to),
            pageable
        );
    }

    private Specification<MonitoredTransaction> buildSearchSpecification(
        String accountId,
        String payeeId,
        TransactionStatus status,
        String search,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Instant from,
        Instant to
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (accountId != null && !accountId.isBlank()) {
                predicates.add(cb.equal(root.get("accountId"), accountId));
            }
            if (payeeId != null && !payeeId.isBlank()) {
                predicates.add(cb.equal(root.get("payeeId"), payeeId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("accountId")), like),
                    cb.like(cb.lower(root.get("payeeId")), like),
                    cb.like(cb.lower(root.get("payeeName")), like),
                    cb.like(cb.lower(root.get("currency")), like),
                    cb.like(cb.lower(root.get("description")), like),
                    cb.like(cb.lower(root.get("status").as(String.class)), like),
                    cb.like(root.get("id").as(String.class), like)
                ));
            }
            if (minAmount != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("amount"), minAmount));
            }
            if (maxAmount != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("amount"), maxAmount));
            }
            if (from != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("occurredAt"), from));
            }
            if (to != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("occurredAt"), to));
            }
            return cb.and(predicates.toArray(Predicate[]::new));
        };
    }
}
