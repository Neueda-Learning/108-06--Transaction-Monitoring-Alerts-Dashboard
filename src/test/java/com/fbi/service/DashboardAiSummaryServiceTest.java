package com.fbi.service;

import com.fbi.dto.AiDashboardSummaryResponse;
import com.fbi.dto.DashboardStatsResponse;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.repository.AlertRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardAiSummaryServiceTest {

    @Mock
    private DashboardService dashboardService;
    @Mock
    private AlertRepository alertRepository;
    @Mock
    private GeminiClient geminiClient;

    private DashboardAiSummaryService dashboardAiSummaryService;

    @BeforeEach
    void setUp() {
        dashboardAiSummaryService = new DashboardAiSummaryService(
            dashboardService, alertRepository, geminiClient, "gemini-2.0-flash"
        );
    }

    private Alert alert(Long id, AlertStatus status, Severity severity) {
        Alert alert = new Alert();
        alert.setId(id);
        alert.setStatus(status);
        alert.setSeverity(severity);
        alert.setRuleName("High Amount");
        alert.setAccountId("ACC-1");
        return alert;
    }

    private DashboardStatsResponse sampleStats() {
        return new DashboardStatsResponse(
            Instant.now(),
            new DashboardStatsResponse.Window(Instant.now().minusSeconds(3600), Instant.now()),
            new DashboardStatsResponse.TransactionStats(10, 5, 2, 20.0, BigDecimal.TEN, BigDecimal.ONE),
            new DashboardStatsResponse.AlertStats(3, 1, 2, null, java.util.Map.of(), java.util.Map.of(), java.util.Map.of()),
            new DashboardStatsResponse.RuleStats(4, 3)
        );
    }

    @Test
    void generateSummary_parsesValidJsonResponse() {
        when(dashboardService.getStats(any(), any())).thenReturn(sampleStats());
        when(alertRepository.findAll()).thenReturn(List.of(alert(1L, AlertStatus.OPEN, Severity.CRITICAL)));
        when(geminiClient.generateContent(any())).thenReturn(
            "{\"narrative\": \"Elevated risk detected.\", "
                + "\"insights\": [\"Critical alerts rising\"], "
                + "\"actionSteps\": [{\"priority\": \"CRITICAL\", \"title\": \"Review\", \"details\": [\"Check alert 1\"]}]}"
        );

        AiDashboardSummaryResponse response = dashboardAiSummaryService.generateSummary();

        assertThat(response.narrative()).isEqualTo("Elevated risk detected.");
        assertThat(response.insights()).containsExactly("Critical alerts rising");
        assertThat(response.actionSteps()).hasSize(1);
        assertThat(response.actionSteps().get(0).priority()).isEqualTo("CRITICAL");
        assertThat(response.model()).isEqualTo("gemini-2.0-flash");
    }

    @Test
    void generateSummary_stripsMarkdownCodeFence() {
        when(dashboardService.getStats(any(), any())).thenReturn(sampleStats());
        when(alertRepository.findAll()).thenReturn(List.of());
        when(geminiClient.generateContent(any())).thenReturn(
            "```json\n{\"narrative\": \"All clear.\", \"insights\": [], \"actionSteps\": []}\n```"
        );

        AiDashboardSummaryResponse response = dashboardAiSummaryService.generateSummary();

        assertThat(response.narrative()).isEqualTo("All clear.");
    }

    @Test
    void generateSummary_malformedJson_fallsBackToRawText() {
        when(dashboardService.getStats(any(), any())).thenReturn(sampleStats());
        when(alertRepository.findAll()).thenReturn(List.of());
        when(geminiClient.generateContent(any())).thenReturn("not valid json at all");

        AiDashboardSummaryResponse response = dashboardAiSummaryService.generateSummary();

        assertThat(response.narrative()).isEqualTo("not valid json at all");
        assertThat(response.insights()).isEmpty();
        assertThat(response.actionSteps()).isEmpty();
    }

    @Test
    void generateSummary_blankResponse_fallsBackToDefaultMessage() {
        when(dashboardService.getStats(any(), any())).thenReturn(sampleStats());
        when(alertRepository.findAll()).thenReturn(List.of());
        when(geminiClient.generateContent(any())).thenReturn("   ");

        AiDashboardSummaryResponse response = dashboardAiSummaryService.generateSummary();

        assertThat(response.narrative()).isEqualTo("No summary generated.");
    }

    @Test
    void generateSummary_excludesClosedAndDismissedAlertsFromOpenGroups() {
        when(dashboardService.getStats(any(), any())).thenReturn(sampleStats());
        when(alertRepository.findAll()).thenReturn(List.of(
            alert(1L, AlertStatus.CLOSED, Severity.CRITICAL),
            alert(2L, AlertStatus.DISMISSED, Severity.HIGH),
            alert(3L, AlertStatus.OPEN, Severity.MEDIUM)
        ));
        when(geminiClient.generateContent(any())).thenReturn(
            "{\"narrative\": \"n\", \"insights\": [], \"actionSteps\": []}"
        );

        dashboardAiSummaryService.generateSummary();

        org.mockito.ArgumentCaptor<String> promptCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(geminiClient).generateContent(promptCaptor.capture());
        assertThat(promptCaptor.getValue()).contains("Medium-severity open alerts (1)");
        assertThat(promptCaptor.getValue()).doesNotContain("Critical-severity open alerts");
    }
}
