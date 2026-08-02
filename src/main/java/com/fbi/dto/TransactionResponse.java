package com.fbi.dto;

import com.fbi.model.TransactionStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record TransactionResponse(
    Long id,
    String accountId,
    String payeeId,
    String payeeName,
    BigDecimal amount,
    String currency,
    String country,
    TransactionStatus status,
    Instant occurredAt,
    String description
) {
}

