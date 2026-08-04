package com.fbi.dto;

import com.fbi.model.AlertStatus;
import java.time.Instant;

public record AlertHistoryEntry(
    AlertStatus status,
    Instant timestamp,
    String note
) {
}

