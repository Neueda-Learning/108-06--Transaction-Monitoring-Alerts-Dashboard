package com.fbi.dto;

import java.util.List;

public record SimulationResult(
    String scenario,
    String description,
    List<TransactionResponse> transactions,
    List<AlertResponse> alerts
) {
}
