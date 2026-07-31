package com.fbi.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record TransactionResponse(
    Long id,
    String accountId,
    String payeeId,
    BigDecimal amount,
    String currency,
    Instant occurredAt,
    String description
) {
}

