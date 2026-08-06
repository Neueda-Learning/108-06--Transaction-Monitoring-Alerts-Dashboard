package com.fbi.controller;

import com.fbi.service.SdnScreeningService;
import com.fbi.service.SdnScreeningService.SdnMatchResult;
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
    public List<SdnMatchResult> search(
        @RequestParam String name,
        @RequestParam(defaultValue = "0.80") double threshold
    ) {
        return sdnScreeningService.searchAll(name, threshold);
    }

    @GetMapping("/count")
    public int count() {
        return sdnScreeningService.getEntryCount();
    }
}
