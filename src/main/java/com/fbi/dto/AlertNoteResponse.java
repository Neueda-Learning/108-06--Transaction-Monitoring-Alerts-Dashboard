package com.fbi.dto;
import java.time.Instant;
public record AlertNoteResponse(
    Long id,
    Long alertId,
    String note,
    Instant createdAt
) {
}
