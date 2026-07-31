package com.fbi.controller;

import com.fbi.dto.TransactionCreateRequest;
import com.fbi.dto.TransactionResponse;
import com.fbi.service.ApiMapper;
import com.fbi.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    @Operation(summary = "Create a transaction and run monitoring rules")
    public TransactionResponse create(@RequestBody @Valid TransactionCreateRequest request) {
        return ApiMapper.toResponse(transactionService.createTransaction(request));
    }

    @GetMapping
    @Operation(summary = "List transactions with optional filters")
    public List<TransactionResponse> search(
        @RequestParam(required = false) String accountId,
        @RequestParam(required = false) String payeeId,
        @RequestParam(required = false) BigDecimal minAmount,
        @RequestParam(required = false) BigDecimal maxAmount,
        @RequestParam(required = false) Instant from,
        @RequestParam(required = false) Instant to
    ) {
        return transactionService.search(accountId, payeeId, minAmount, maxAmount, from, to)
            .stream()
            .map(ApiMapper::toResponse)
            .toList();
    }
}

