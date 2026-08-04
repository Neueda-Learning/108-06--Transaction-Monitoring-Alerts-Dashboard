package com.fbi;

import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SimulatorControllerTest {

    @Autowired
    private org.springframework.test.web.servlet.MockMvc mockMvc;

    @Autowired
    private MonitoredTransactionRepository transactionRepository;

    @Autowired
    private AlertRepository alertRepository;

    @BeforeEach
    void setup() {
        alertRepository.deleteAll();
        transactionRepository.deleteAll();
    }

    @Test
    void listsAllScenarios() throws Exception {
        mockMvc.perform(get("/api/simulator/scenarios"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(6));
    }

    @Test
    void rejectsUnknownScenario() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "does-not-exist"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void cleanScenarioCreatesOneApprovedTransactionWithNoAlerts() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "clean"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.scenario").value("clean"))
            .andExpect(jsonPath("$.transactions.length()").value(1))
            .andExpect(jsonPath("$.transactions[0].status").value("APPROVED"))
            .andExpect(jsonPath("$.transactions[0].riskScore").value(0))
            .andExpect(jsonPath("$.alerts.length()").value(0));
    }

    @Test
    void amountThresholdScenarioFlagsTransactionWithAlert() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "amount-threshold"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions.length()").value(1))
            .andExpect(jsonPath("$.transactions[0].status").value("FLAGGED"))
            // The single transaction is also to a brand-new payee, so both
            // AMOUNT_THRESHOLD (HIGH=60) and NEW_PAYEE (MEDIUM=35) alerts fire: 60+35=95.
            .andExpect(jsonPath("$.transactions[0].riskScore").value(95))
            .andExpect(jsonPath("$.alerts[?(@.ruleType == 'AMOUNT_THRESHOLD')]").isNotEmpty());
    }

    @Test
    void velocityBurstScenarioCreatesSixTransactionsAndTriggersVelocityAlertOnce() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "velocity-burst"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions.length()").value(6))
            .andExpect(jsonPath("$.alerts.length()").value(2))
            .andExpect(jsonPath("$.alerts[?(@.ruleType == 'VELOCITY')]").isNotEmpty())
            .andExpect(jsonPath("$.alerts[?(@.ruleType == 'NEW_PAYEE')]").isNotEmpty());
    }

    @Test
    void newPayeeScenarioTriggersNewPayeeAlert() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "new-payee"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions.length()").value(1))
            .andExpect(jsonPath("$.transactions[0].riskScore").value(35))
            .andExpect(jsonPath("$.alerts[0].ruleType").value("NEW_PAYEE"));
    }

    @Test
    void dailyLimitScenarioCreatesSixTransactionsAndTriggersDailyLimitAlertOnce() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "daily-limit"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions.length()").value(6))
            .andExpect(jsonPath("$.alerts.length()").value(2))
            .andExpect(jsonPath("$.alerts[?(@.ruleType == 'DAILY_LIMIT')]").isNotEmpty())
            .andExpect(jsonPath("$.alerts[?(@.ruleType == 'NEW_PAYEE')]").isNotEmpty());
    }

    @Test
    void sdnMatchScenarioBlocksTransactionWithCriticalAlert() throws Exception {
        mockMvc.perform(post("/api/simulator/scenarios/{scenario}", "sdn-match"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.transactions.length()").value(1))
            .andExpect(jsonPath("$.transactions[0].status").value("BLOCKED"))
            .andExpect(jsonPath("$.transactions[0].riskScore").value(100))
            .andExpect(jsonPath("$.alerts[0].ruleType").value("SDN_MATCH"))
            .andExpect(jsonPath("$.alerts[0].severity").value("CRITICAL"));
    }
}
