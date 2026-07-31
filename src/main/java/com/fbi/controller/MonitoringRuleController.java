package com.fbi.controller;

import com.fbi.dto.MonitoringRuleRequest;
import com.fbi.dto.MonitoringRuleResponse;
import com.fbi.service.ApiMapper;
import com.fbi.service.MonitoringRuleService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rules")
public class MonitoringRuleController {

    private final MonitoringRuleService monitoringRuleService;

    public MonitoringRuleController(MonitoringRuleService monitoringRuleService) {
        this.monitoringRuleService = monitoringRuleService;
    }

    @GetMapping
    @Operation(summary = "List monitoring rules")
    public List<MonitoringRuleResponse> getAll() {
        return monitoringRuleService.getAll().stream().map(ApiMapper::toResponse).toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a monitoring rule")
    public MonitoringRuleResponse getById(@PathVariable Long id) {
        return ApiMapper.toResponse(monitoringRuleService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a monitoring rule")
    public MonitoringRuleResponse create(@RequestBody @Valid MonitoringRuleRequest request) {
        return ApiMapper.toResponse(monitoringRuleService.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a monitoring rule")
    public MonitoringRuleResponse update(@PathVariable Long id, @RequestBody @Valid MonitoringRuleRequest request) {
        return ApiMapper.toResponse(monitoringRuleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a monitoring rule")
    public void delete(@PathVariable Long id) {
        monitoringRuleService.delete(id);
    }
}

