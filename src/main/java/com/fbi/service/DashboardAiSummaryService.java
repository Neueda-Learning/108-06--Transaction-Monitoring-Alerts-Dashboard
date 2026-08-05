package com.fbi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fbi.dto.AiDashboardSummaryResponse;
import com.fbi.dto.DashboardStatsResponse;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import com.fbi.repository.AlertRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Generates an AI-assisted narrative summary of live dashboard activity by
 * gathering current KPI stats and open alerts, then asking Gemini to
 * synthesize a narrative, key insights, and prioritized action steps.
 *
 * A single-shot prompt (context gathered up front, one LLM call) is used,
 * mirroring the approach in {@link InvestigationAgentService}.
 */
@Service
public class DashboardAiSummaryService {

    private final DashboardService dashboardService;
    private final AlertRepository alertRepository;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public DashboardAiSummaryService(
        DashboardService dashboardService,
        AlertRepository alertRepository,
        GeminiClient geminiClient,
        @Value("${gemini.api.model:gemini-2.0-flash}") String model
    ) {
        this.dashboardService = dashboardService;
        this.alertRepository = alertRepository;
        this.geminiClient = geminiClient;
        this.objectMapper = new ObjectMapper();
        this.model = model;
    }

    public AiDashboardSummaryResponse generateSummary() {
        DashboardStatsResponse stats = dashboardService.getStats(null, null);

        List<Alert> openAlerts = alertRepository.findAll().stream()
            .filter(alert -> alert.getStatus() != AlertStatus.CLOSED && alert.getStatus() != AlertStatus.DISMISSED)
            .toList();

        List<Alert> criticalOpen = filterBySeverity(openAlerts, Severity.CRITICAL);
        List<Alert> highOpen = filterBySeverity(openAlerts, Severity.HIGH);
        List<Alert> mediumOpen = filterBySeverity(openAlerts, Severity.MEDIUM);

        String prompt = buildPrompt(stats, openAlerts.size(), criticalOpen, highOpen, mediumOpen);
        String rawResponse = geminiClient.generateContent(prompt);
        ParsedSummary parsed = parseResponse(rawResponse);

        return new AiDashboardSummaryResponse(
            Instant.now(),
            parsed.narrative(),
            parsed.insights(),
            parsed.actionSteps(),
            model
        );
    }

    private static List<Alert> filterBySeverity(List<Alert> alerts, Severity severity) {
        return alerts.stream().filter(alert -> alert.getSeverity() == severity).toList();
    }

    private String buildPrompt(
        DashboardStatsResponse stats,
        int openAlertCount,
        List<Alert> criticalOpen,
        List<Alert> highOpen,
        List<Alert> mediumOpen
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a fraud operations analyst assistant summarizing a live transaction monitoring dashboard. ")
            .append("Respond ONLY with a JSON object of the form ")
            .append("{\"narrative\": string, \"insights\": string[], \"actionSteps\": ")
            .append("[{\"priority\": \"CRITICAL\"|\"HIGH\"|\"MEDIUM\", \"title\": string, \"details\": string[]}]} ")
            .append("and no other text.\n\n");

        sb.append("Dashboard stats:\n")
            .append("- Total transactions: ").append(stats.transactions().totalCount()).append("\n")
            .append("- Flagged or blocked: ").append(stats.transactions().flaggedOrBlockedCount())
            .append(" (").append(String.format("%.1f", stats.transactions().flaggedOrBlockedRatePercent())).append("%)\n")
            .append("- Open alerts: ").append(openAlertCount).append("\n")
            .append("- Active rules: ").append(stats.rules().activeCount()).append(" of ").append(stats.rules().totalCount()).append("\n\n");

        appendAlertGroup(sb, "Critical-severity open alerts", criticalOpen);
        appendAlertGroup(sb, "High-severity open alerts", highOpen);
        appendAlertGroup(sb, "Medium-severity open alerts", mediumOpen);

        sb.append("Write a concise 2-3 sentence narrative overview, 3-5 bullet insights, ")
            .append("and prioritized action steps (only include priorities that have open alerts). ")
            .append("Each action step's details should reference specific alert IDs, rule names, and account IDs from the data above.");

        return sb.toString();
    }

    private void appendAlertGroup(StringBuilder sb, String label, List<Alert> alerts) {
        if (alerts.isEmpty()) {
            return;
        }
        sb.append(label).append(" (").append(alerts.size()).append("):\n");
        alerts.stream().limit(5).forEach(alert -> sb.append("  - Alert #").append(alert.getId())
            .append(": ").append(alert.getRuleName())
            .append(" on account ").append(alert.getAccountId())
            .append("\n"));
        sb.append("\n");
    }

    private ParsedSummary parseResponse(String rawResponse) {
        String cleaned = rawResponse == null ? "" : rawResponse.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(json)?", "").replaceFirst("```$", "").trim();
        }

        try {
            JsonNode node = objectMapper.readTree(cleaned);
            String narrative = node.path("narrative").asText("");
            if (narrative.isBlank()) {
                throw new IllegalStateException("blank narrative");
            }

            List<String> insights = new ArrayList<>();
            node.path("insights").forEach(insight -> insights.add(insight.asText()));

            List<AiDashboardSummaryResponse.ActionStep> actionSteps = new ArrayList<>();
            node.path("actionSteps").forEach(step -> {
                List<String> details = new ArrayList<>();
                step.path("details").forEach(detail -> details.add(detail.asText()));
                actionSteps.add(new AiDashboardSummaryResponse.ActionStep(
                    step.path("priority").asText("MEDIUM"),
                    step.path("title").asText(""),
                    details
                ));
            });

            return new ParsedSummary(narrative, insights, actionSteps);
        } catch (Exception ignored) {
            // fall through to raw-text fallback below
        }

        return new ParsedSummary(
            cleaned.isBlank() ? "No summary generated." : cleaned,
            List.of(),
            List.of()
        );
    }

    private record ParsedSummary(String narrative, List<String> insights, List<AiDashboardSummaryResponse.ActionStep> actionSteps) {
    }
}
