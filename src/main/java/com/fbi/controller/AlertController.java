package com.fbi.controller;

import com.fbi.dto.AlertHistoryEntry;
import com.fbi.dto.AlertInvestigationRequest;
import com.fbi.dto.AlertInvestigationResponse;
import com.fbi.dto.AlertNoteCreateRequest;
import com.fbi.dto.AlertNoteResponse;
import com.fbi.dto.PagedResponse;
import com.fbi.dto.AlertResponse;
import com.fbi.dto.AlertStatusUpdateRequest;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import com.fbi.service.AlertService;
import com.fbi.service.ApiMapper;
import jakarta.validation.Valid;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
    public List<AlertResponse> getAll(
        @RequestParam(required = false) AlertStatus status,
        @RequestParam(required = false) Severity severity
    ) {
        return alertService.getAlerts(status, severity)
            .stream()
            .map(ApiMapper::toResponse)
            .toList();
    }

    @GetMapping(params = {"page", "size"})
    public PagedResponse<AlertResponse> getAllPaged(
        @RequestParam(required = false) AlertStatus status,
        @RequestParam(required = false) Severity severity,
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );
        return ApiMapper.toPagedResponse(
            alertService.getAlertsPaged(status, severity, search, pageable),
            ApiMapper::toResponse
        );
    }

    @GetMapping("/{id}")
    public AlertResponse getById(@PathVariable Long id) {
        return ApiMapper.toResponse(alertService.getById(id));
    }

    @PatchMapping("/{id}/status")
    public AlertResponse updateStatus(@PathVariable Long id, @RequestBody @Valid AlertStatusUpdateRequest request) {
        return ApiMapper.toResponse(alertService.updateStatus(id, request.status(), request.note()));
    }

    @GetMapping("/{id}/history")
    public List<AlertHistoryEntry> getHistory(@PathVariable Long id) {
        return alertService.getAlertHistory(id);
    }

    @PostMapping("/{id}/notes")
    @ResponseStatus(HttpStatus.CREATED)
    public AlertNoteResponse addNote(@PathVariable Long id, @RequestBody @Valid AlertNoteCreateRequest request) {
        return alertService.addNote(id, request.note());
    }

    @PostMapping("/{id}/investigate")
    public AlertInvestigationResponse investigate(
        @PathVariable Long id,
        @RequestBody(required = false) AlertInvestigationRequest request
    ) {
        boolean persist = request != null && request.persistToLifecycleNote();
        return alertService.investigateAlert(id, persist);
    }
}
