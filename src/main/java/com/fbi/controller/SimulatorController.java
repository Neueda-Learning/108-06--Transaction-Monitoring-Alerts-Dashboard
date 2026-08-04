package com.fbi.controller;

import com.fbi.dto.SimulationResult;
import com.fbi.service.SimulatorService;
import io.swagger.v3.oas.annotations.Operation;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/simulator")
public class SimulatorController {

    private final SimulatorService simulatorService;

    public SimulatorController(SimulatorService simulatorService) {
        this.simulatorService = simulatorService;
    }

    @GetMapping("/scenarios")
    @Operation(summary = "List available simulator scenarios")
    public List<Map<String, String>> listScenarios() {
        return SimulatorService.SCENARIOS.entrySet().stream()
            .map(entry -> Map.of("scenario", entry.getKey(), "description", entry.getValue()))
            .toList();
    }

    @PostMapping("/scenarios/{scenario}")
    @Operation(summary = "Run a preset simulator scenario and return the generated transactions and alerts")
    public SimulationResult runScenario(@PathVariable String scenario) {
        return simulatorService.runScenario(scenario);
    }
}
