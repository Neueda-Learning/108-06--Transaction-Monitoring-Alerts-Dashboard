package com.fbi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fbi.dto.AiInvestigationResponse;
import com.fbi.dto.AlertInvestigationResponse;
import com.fbi.model.Alert;
import com.fbi.model.MonitoredTransaction;
import com.fbi.repository.MonitoredTransactionRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Orchestrates an AI-assisted investigation for an alert: gathers context via
 * existing services/tools, asks Gemini for a natural-language summary and
 * recommendation, and returns a structured response.
 *
 * A single-shot prompt (context gathered up front, one LLM call) is used
 * instead of a multi-turn tool-calling loop for demo reliability.
 */
@Service
public class InvestigationAgentService {

    private final AlertService alertService;
    private final MonitoredTransactionRepository transactionRepository;
    private final AlertToolService alertToolService;
    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;
    private final String model;

    public InvestigationAgentService(
        AlertService alertService,
        MonitoredTransactionRepository transactionRepository,
        AlertToolService alertToolService,
        GeminiClient geminiClient,
        @Value("${gemini.api.model:gemini-2.0-flash}") String model
    ) {
        this.alertService = alertService;
        this.transactionRepository = transactionRepository;
        this.alertToolService = alertToolService;
        this.geminiClient = geminiClient;
        this.objectMapper = new ObjectMapper();
        this.model = model;
    }

    public AiInvestigationResponse investigate(Long alertId) {
        Alert alert = alertService.getById(alertId);
        MonitoredTransaction transaction = transactionRepository.findById(alert.getTransactionId()).orElse(null);
        AlertInvestigationResponse baseline = alertService.investigateAlert(alertId, false);
        List<MonitoredTransaction> history = alertToolService.getRecentTransactionHistory(alert.getAccountId());
        SdnScreeningService.SdnMatchResult sdnMatch = transaction != null
            ? alertToolService.checkSdnStatus(transaction.getPayeeName())
            : null;

        String prompt = buildPrompt(alert, transaction, baseline, history, sdnMatch);
        String rawResponse = geminiClient.generateContent(prompt);
        ParsedAiResponse parsed = parseResponse(rawResponse);

        return new AiInvestigationResponse(
            alert.getId(),
            baseline.riskLevel(),
            parsed.summary(),
            parsed.recommendation(),
            baseline.keyFindings(),
            model,
            Instant.now()
        );
    }

    private String buildPrompt(
        Alert alert,
        MonitoredTransaction transaction,
        AlertInvestigationResponse baseline,
        List<MonitoredTransaction> history,
        SdnScreeningService.SdnMatchResult sdnMatch
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a financial crime analyst assistant reviewing a monitoring alert. ")
            .append("Respond ONLY with a JSON object of the form ")
            .append("{\"summary\": string, \"recommendation\": string} and no other text.\n\n");

        sb.append("Alert #").append(alert.getId())
            .append(": rule=").append(alert.getRuleName())
            .append(", type=").append(alert.getRuleType())
            .append(", severity=").append(alert.getSeverity())
            .append(", status=").append(alert.getStatus())
            .append(", riskLevel=").append(baseline.riskLevel())
            .append("\n");

        if (transaction != null) {
            sb.append("Transaction: amount=").append(transaction.getAmount())
                .append(" ").append(transaction.getCurrency())
                .append(", account=").append(transaction.getAccountId())
                .append(", payee=").append(transaction.getPayeeName())
                .append(", country=").append(transaction.getCountry())
                .append(", riskScore=").append(transaction.getRiskScore())
                .append("\n");
        }

        sb.append("Deterministic findings:\n");
        for (String finding : baseline.keyFindings()) {
            sb.append("- ").append(finding).append("\n");
        }

        sb.append("Recent account transaction history (most recent first, up to 10):\n");
        for (MonitoredTransaction t : history) {
            sb.append("- ").append(t.getOccurredAt())
                .append(": ").append(t.getAmount()).append(" ").append(t.getCurrency())
                .append(" to ").append(t.getPayeeName())
                .append(" (").append(t.getCountry()).append(")")
                .append("\n");
        }

        if (sdnMatch != null) {
            sb.append("SDN sanctions screening: possible match to '")
                .append(sdnMatch.matchedEntry().name())
                .append("' (country=").append(sdnMatch.matchedEntry().country())
                .append(", similarity=").append(String.format("%.2f", sdnMatch.score()))
                .append(")\n");
        } else {
            sb.append("SDN sanctions screening: no match found.\n");
        }

        sb.append("\nProvide a concise summary of the situation and a clear recommendation ")
            .append("(e.g. close as false positive, escalate for manual review, file a SAR, etc.).");

        return sb.toString();
    }

    private ParsedAiResponse parseResponse(String rawResponse) {
        String cleaned = rawResponse == null ? "" : rawResponse.trim();
        if (cleaned.startsWith("```")) {
            cleaned = cleaned.replaceFirst("^```(json)?", "").replaceFirst("```$", "").trim();
        }

        try {
            JsonNode node = objectMapper.readTree(cleaned);
            String summary = node.path("summary").asText("");
            String recommendation = node.path("recommendation").asText("");
            if (!summary.isBlank()) {
                return new ParsedAiResponse(summary, recommendation.isBlank() ? "Review manually." : recommendation);
            }
        } catch (Exception ignored) {
            // fall through to raw-text fallback below
        }

        return new ParsedAiResponse(cleaned.isBlank() ? "No summary generated." : cleaned, "Review manually.");
    }

    private record ParsedAiResponse(String summary, String recommendation) {
    }
}
