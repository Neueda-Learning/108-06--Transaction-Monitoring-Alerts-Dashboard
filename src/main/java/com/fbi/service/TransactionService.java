package com.fbi.service;

import com.fbi.dto.TransactionCreateRequest;
import com.fbi.model.MonitoredTransaction;
import com.fbi.repository.MonitoredTransactionRepository;
import jakarta.persistence.criteria.Predicate;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class TransactionService {

    private final MonitoredTransactionRepository transactionRepository;
    private final RuleEvaluationService ruleEvaluationService;

    public TransactionService(MonitoredTransactionRepository transactionRepository, RuleEvaluationService ruleEvaluationService) {
        this.transactionRepository = transactionRepository;
        this.ruleEvaluationService = ruleEvaluationService;
    }

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

        MonitoredTransaction saved = transactionRepository.save(transaction);
        ruleEvaluationService.evaluateAndCreateAlerts(saved);
        return saved;
    }

    public List<MonitoredTransaction> search(
        String accountId,
        String payeeId,
        BigDecimal minAmount,
        BigDecimal maxAmount,
        Instant from,
        Instant to
    ) {
        Specification<MonitoredTransaction> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (accountId != null && !accountId.isBlank()) {
                predicates.add(cb.equal(root.get("accountId"), accountId));
            }
            if (payeeId != null && !payeeId.isBlank()) {
                predicates.add(cb.equal(root.get("payeeId"), payeeId));
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

        return transactionRepository.findAll(spec);
    }
}

