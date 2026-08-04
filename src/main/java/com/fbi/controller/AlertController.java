package com.fbi.controller;

import com.fbi.dto.AlertHistoryEntry;
import com.fbi.dto.AlertInvestigationRequest;
import com.fbi.dto.AlertInvestigationResponse;
import com.fbi.dto.AlertNoteCreateRequest;
import com.fbi.dto.AlertNoteResponse;
import com.fbi.dto.AlertResponse;
import com.fbi.dto.AlertStatusUpdateRequest;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import com.fbi.service.AlertService;
import com.fbi.service.ApiMapper;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
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

    @GetMapping("/{id}/history")
    @Operation(summary = "Get alert audit trail history")
    public List<AlertHistoryEntry> getHistory(@PathVariable Long id) {
        return alertService.getAlertHistory(id);
    }

    @PostMapping("/{id}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Add investigation note to an alert")
    public AlertNoteResponse addNote(@PathVariable Long id, @RequestBody @Valid AlertNoteCreateRequest request) {
        return alertService.addNote(id, request.note());
    }

    @PostMapping("/{id}/investigate")
    @Operation(summary = "Generate deterministic investigation summary for an alert")
    public AlertInvestigationResponse investigate(
        @PathVariable Long id,
        @RequestBody(required = false) AlertInvestigationRequest request
    ) {
        boolean persist = request != null && request.persistToLifecycleNote();
        return alertService.investigateAlert(id, persist);
    }
}
