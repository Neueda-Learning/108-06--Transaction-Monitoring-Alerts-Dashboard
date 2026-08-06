package com.fbi.controller;

import com.fbi.dto.MonitoringRuleRequest;
import com.fbi.dto.MonitoringRuleResponse;
import com.fbi.dto.PagedResponse;
import com.fbi.service.ApiMapper;
import com.fbi.service.MonitoringRuleService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PatchMapping;

@RestController
@RequestMapping("/api/rules")
public class MonitoringRuleController {

    private final MonitoringRuleService monitoringRuleService;

    public MonitoringRuleController(MonitoringRuleService monitoringRuleService) {
        this.monitoringRuleService = monitoringRuleService;
    }

    @GetMapping
    public List<MonitoringRuleResponse> getAll() {
        return monitoringRuleService.getAll().stream().map(ApiMapper::toResponse).toList();
    }

    @GetMapping(params = {"page", "size"})
    public PagedResponse<MonitoringRuleResponse> getAllPaged(
        @RequestParam(required = false) String search,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            Sort.by(Sort.Order.asc("name"), Sort.Order.asc("id"))
        );
        return ApiMapper.toPagedResponse(monitoringRuleService.getAllPaged(search, pageable), ApiMapper::toResponse);
    }

    @GetMapping("/{id}")
    public MonitoringRuleResponse getById(@PathVariable Long id) {
        return ApiMapper.toResponse(monitoringRuleService.getById(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MonitoringRuleResponse create(@RequestBody @Valid MonitoringRuleRequest request) {
        return ApiMapper.toResponse(monitoringRuleService.create(request));
    }

    @PutMapping("/{id}")
    public MonitoringRuleResponse update(@PathVariable Long id, @RequestBody @Valid MonitoringRuleRequest request) {
        return ApiMapper.toResponse(monitoringRuleService.update(id, request));
    }

    @PatchMapping("/{id}/toggle")
    public MonitoringRuleResponse toggle(@PathVariable Long id) {
        return ApiMapper.toResponse(monitoringRuleService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        monitoringRuleService.delete(id);
    }
}
