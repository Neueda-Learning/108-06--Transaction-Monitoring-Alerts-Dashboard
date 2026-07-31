package com.fbi.dto;

import com.fbi.model.AlertStatus;
import jakarta.validation.constraints.NotNull;

public record AlertStatusUpdateRequest(
    @NotNull AlertStatus status,
    String note
) {
}

