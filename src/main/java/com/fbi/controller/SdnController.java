package com.fbi.controller;

import com.fbi.service.SdnScreeningService;
import com.fbi.service.SdnScreeningService.SdnMatchResult;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sdn")
public class SdnController {

    private final SdnScreeningService sdnScreeningService;

    public SdnController(SdnScreeningService sdnScreeningService) {
        this.sdnScreeningService = sdnScreeningService;
    }

    @GetMapping("/search")
    @Operation(summary = "Search SDN list by name with fuzzy matching")
    public List<SdnMatchResult> search(
        @RequestParam String name,
        @RequestParam(defaultValue = "0.80") double threshold
    ) {
        return sdnScreeningService.searchAll(name, threshold);
    }

    @GetMapping("/count")
    @Operation(summary = "Get the number of SDN entries loaded in memory")
    public int count() {
        return sdnScreeningService.getEntryCount();
    }
}
