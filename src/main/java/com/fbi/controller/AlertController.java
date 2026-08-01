package com.fbi.controller;

import com.fbi.dto.AlertResponse;
import com.fbi.dto.AlertStatusUpdateRequest;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import com.fbi.service.AlertService;
import com.fbi.service.ApiMapper;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    @Operation(summary = "List alerts with optional status and severity filters")
    public List<AlertResponse> getAll(
        @RequestParam(required = false) AlertStatus status,
        @RequestParam(required = false) Severity severity
    ) {
        return alertService.getAlerts(status, severity)
            .stream()
            .map(ApiMapper::toResponse)
            .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get alert details")
    public AlertResponse getById(@PathVariable Long id) {
        return ApiMapper.toResponse(alertService.getById(id));
    }

    @PatchMapping("/{id}/status")
    @Operation(summary = "Advance alert lifecycle state")
    public AlertResponse updateStatus(@PathVariable Long id, @RequestBody @Valid AlertStatusUpdateRequest request) {
        return ApiMapper.toResponse(alertService.updateStatus(id, request.status(), request.note()));
    }
}


