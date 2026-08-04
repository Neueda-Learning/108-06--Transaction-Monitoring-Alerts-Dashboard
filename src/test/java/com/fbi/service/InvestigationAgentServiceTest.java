package com.fbi.service;

import com.fbi.dto.AiInvestigationResponse;
import com.fbi.dto.AlertInvestigationResponse;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.repository.MonitoredTransactionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the AI investigation orchestration. The real Gemini API is
 * never called - the client is mocked so tests are fast and deterministic.
 */
@ExtendWith(MockitoExtension.class)
class InvestigationAgentServiceTest {

    @Mock
    private AlertService alertService;
    @Mock
    private MonitoredTransactionRepository transactionRepository;
    @Mock
    private AlertToolService alertToolService;
    @Mock
    private GeminiClient geminiClient;

    private InvestigationAgentService investigationAgentService;

    @BeforeEach
    void setUp() {
        investigationAgentService = new InvestigationAgentService(
            alertService, transactionRepository, alertToolService, geminiClient, "gemini-2.0-flash"
        );
    }

    private Alert sampleAlert() {
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTransactionId(10L);
        alert.setAccountId("ACC-1");
        alert.setRuleId(2L);
        alert.setRuleName("Amount Threshold");
        alert.setRuleType(RuleType.AMOUNT_THRESHOLD);
        alert.setSeverity(Severity.HIGH);
        alert.setStatus(AlertStatus.OPEN);
        alert.setMessage("High value transaction");
        alert.setCreatedAt(Instant.now());
        return alert;
    }

    private MonitoredTransaction sampleTransaction() {
        MonitoredTransaction transaction = new MonitoredTransaction();
        transaction.setId(10L);
        transaction.setAccountId("ACC-1");
        transaction.setPayeeId("PAYEE-1");
        transaction.setPayeeName("John Smith");
        transaction.setAmount(new BigDecimal("9500.00"));
        transaction.setCurrency("USD");
        transaction.setCountry("US");
        transaction.setRiskScore(60);
        transaction.setOccurredAt(Instant.now());
        return transaction;
    }

    private AlertInvestigationResponse sampleBaseline() {
        return new AlertInvestigationResponse(
            1L,
            AlertStatus.OPEN,
            Severity.HIGH,
            "HIGH",
            "Investigation generated for alert 1",
            List.of("Rule triggered: Amount Threshold (AMOUNT_THRESHOLD)"),
            0,
            Instant.now(),
            false
        );
    }

    @Test
    void investigate_parsesJsonResponseFromGemini() {
        when(alertService.getById(1L)).thenReturn(sampleAlert());
        when(transactionRepository.findById(10L)).thenReturn(Optional.of(sampleTransaction()));
        when(alertService.investigateAlert(1L, false)).thenReturn(sampleBaseline());
        when(alertToolService.getRecentTransactionHistory("ACC-1")).thenReturn(List.of());
        when(alertToolService.checkSdnStatus("John Smith")).thenReturn(null);
        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
            .thenReturn("{\"summary\": \"Large payment to a known payee.\", \"recommendation\": \"Close as false positive.\"}");

        AiInvestigationResponse response = investigationAgentService.investigate(1L);

        assertThat(response.alertId()).isEqualTo(1L);
        assertThat(response.riskLevel()).isEqualTo("HIGH");
        assertThat(response.summary()).isEqualTo("Large payment to a known payee.");
        assertThat(response.recommendation()).isEqualTo("Close as false positive.");
        assertThat(response.model()).isEqualTo("gemini-2.0-flash");
    }

    @Test
    void investigate_fallsBackToRawTextWhenResponseIsNotJson() {
        when(alertService.getById(1L)).thenReturn(sampleAlert());
        when(transactionRepository.findById(10L)).thenReturn(Optional.of(sampleTransaction()));
        when(alertService.investigateAlert(1L, false)).thenReturn(sampleBaseline());
        when(alertToolService.getRecentTransactionHistory("ACC-1")).thenReturn(List.of());
        when(alertToolService.checkSdnStatus("John Smith")).thenReturn(null);
        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
            .thenReturn("This transaction looks fine, no action needed.");

        AiInvestigationResponse response = investigationAgentService.investigate(1L);

        assertThat(response.summary()).isEqualTo("This transaction looks fine, no action needed.");
        assertThat(response.recommendation()).isEqualTo("Review manually.");
    }

    @Test
    void investigate_handlesMissingTransactionGracefully() {
        when(alertService.getById(1L)).thenReturn(sampleAlert());
        when(transactionRepository.findById(10L)).thenReturn(Optional.empty());
        when(alertService.investigateAlert(1L, false)).thenReturn(sampleBaseline());
        when(alertToolService.getRecentTransactionHistory("ACC-1")).thenReturn(List.of());
        when(geminiClient.generateContent(org.mockito.ArgumentMatchers.anyString()))
            .thenReturn("{\"summary\": \"No transaction on file.\", \"recommendation\": \"Escalate.\"}");

        AiInvestigationResponse response = investigationAgentService.investigate(1L);

        assertThat(response.summary()).isEqualTo("No transaction on file.");
        assertThat(response.recommendation()).isEqualTo("Escalate.");
    }
}
