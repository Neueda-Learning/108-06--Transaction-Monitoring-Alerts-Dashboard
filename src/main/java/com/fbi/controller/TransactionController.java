package com.fbi.controller;

import com.fbi.dto.TransactionCreateRequest;
import com.fbi.dto.TransactionResponse;
import com.fbi.dto.TransactionRuleResult;
import com.fbi.dto.PagedResponse;
import com.fbi.model.TransactionStatus;
import com.fbi.service.ApiMapper;
import com.fbi.service.TransactionService;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public TransactionResponse create(@RequestBody @Valid TransactionCreateRequest request) {
        return ApiMapper.toResponse(transactionService.createTransaction(request));
    }

    @GetMapping("/{id}")
    public TransactionResponse getById(@PathVariable Long id) {
        return ApiMapper.toResponse(transactionService.getById(id));
    }

    @GetMapping("/{id}/rule-results")
    public List<TransactionRuleResult> getRuleResults(@PathVariable Long id) {
        return transactionService.getRuleResults(id);
    }

    @GetMapping
    public List<TransactionResponse> search(
        @RequestParam(required = false) String accountId,
        @RequestParam(required = false) String payeeId,
        @RequestParam(required = false) TransactionStatus status,
        @RequestParam(required = false) BigDecimal minAmount,
        @RequestParam(required = false) BigDecimal maxAmount,
        @RequestParam(required = false) Instant from,
        @RequestParam(required = false) Instant to
    ) {
        return transactionService.search(accountId, payeeId, status, minAmount, maxAmount, from, to)
            .stream()
            .map(ApiMapper::toResponse)
            .toList();
    }

    @GetMapping(params = {"page", "size"})
    public PagedResponse<TransactionResponse> searchPaged(
        @RequestParam(required = false) String accountId,
        @RequestParam(required = false) String payeeId,
        @RequestParam(required = false) TransactionStatus status,
        @RequestParam(required = false) String search,
        @RequestParam(required = false) BigDecimal minAmount,
        @RequestParam(required = false) BigDecimal maxAmount,
        @RequestParam(required = false) Instant from,
        @RequestParam(required = false) Instant to,
        @RequestParam(required = false, defaultValue = "TIME_DESC") String sortBy,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        Sort sort = switch (sortBy) {
            case "AMOUNT_ASC" -> Sort.by(Sort.Order.asc("amount"), Sort.Order.desc("id"));
            case "AMOUNT_DESC" -> Sort.by(Sort.Order.desc("amount"), Sort.Order.desc("id"));
            default -> Sort.by(Sort.Order.desc("occurredAt"), Sort.Order.desc("id"));
        };
        Pageable pageable = PageRequest.of(
            Math.max(page, 0),
            Math.max(size, 1),
            sort
        );
        return ApiMapper.toPagedResponse(
            transactionService.searchPaged(accountId, payeeId, status, search, minAmount, maxAmount, from, to, pageable),
            ApiMapper::toResponse
        );
    }
}
