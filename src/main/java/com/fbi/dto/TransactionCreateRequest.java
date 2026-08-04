package com.fbi.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

public record TransactionCreateRequest(
    @NotBlank String accountId,
    @NotBlank String payeeId,
    String payeeName,
    @NotNull @DecimalMin("0.01") BigDecimal amount,
    @NotBlank String currency,
    String country,
    Instant occurredAt,
    String description
) {
}

