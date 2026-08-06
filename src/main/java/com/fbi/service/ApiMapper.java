package com.fbi.service;

import com.fbi.dto.AlertResponse;
import com.fbi.dto.PagedResponse;
import com.fbi.dto.MonitoringRuleResponse;
import com.fbi.dto.TransactionResponse;
import com.fbi.model.Alert;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.MonitoringRule;
import java.util.function.Function;
import org.springframework.data.domain.Page;

public final class ApiMapper {

    private ApiMapper() {
    }

    public static TransactionResponse toResponse(MonitoredTransaction transaction) {
        return new TransactionResponse(
            transaction.getId(),
            transaction.getAccountId(),
            transaction.getPayeeId(),
            transaction.getPayeeName(),
            transaction.getAmount(),
            transaction.getCurrency(),
            transaction.getCountry(),
            transaction.getStatus(),
            transaction.getOccurredAt(),
            transaction.getDescription(),
            transaction.getRiskScore()
        );
    }

    public static AlertResponse toResponse(Alert alert) {
        return new AlertResponse(
            alert.getId(),
            alert.getTransactionId(),
            alert.getAccountId(),
            alert.getRuleId(),
            alert.getRuleName(),
            alert.getRuleType(),
            alert.getSeverity(),
            alert.getStatus(),
            alert.getMessage(),
            alert.getLifecycleNote(),
            alert.getCreatedAt(),
            alert.getAcknowledgedAt(),
            alert.getInvestigatingAt(),
            alert.getClosedAt(),
            alert.getDismissedAt()
        );
    }

    public static MonitoringRuleResponse toResponse(MonitoringRule rule) {
        return new MonitoringRuleResponse(
            rule.getId(),
            rule.getName(),
            rule.getType(),
            rule.getSeverity(),
            rule.isActive(),
            rule.getAmountThreshold(),
            rule.getVelocityCount(),
            rule.getVelocityWindowMinutes(),
            rule.getDailyLimit()
        );
    }

    public static <S, T> PagedResponse<T> toPagedResponse(Page<S> page, Function<S, T> mapper) {
        return new PagedResponse<>(
            page.getContent().stream().map(mapper).toList(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages()
        );
    }
}

