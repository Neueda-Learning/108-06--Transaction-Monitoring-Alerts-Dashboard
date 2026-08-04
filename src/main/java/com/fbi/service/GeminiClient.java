package com.fbi.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fbi.exception.AiServiceException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Thin HTTP client for Google's Gemini generateContent REST API.
 * The API key is only ever read from configuration (which itself only reads
 * from the GEMINI_API_KEY environment variable) - it is never hardcoded or logged.
 */
@Component
public class GeminiClient {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final String baseUrl;

    public GeminiClient(
        @Value("${gemini.api.key:}") String apiKey,
        @Value("${gemini.api.model:gemini-2.0-flash}") String model,
        @Value("${gemini.api.url:https://generativelanguage.googleapis.com/v1beta/models}") String baseUrl
    ) {
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.objectMapper = new ObjectMapper();
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Sends a single-shot prompt to Gemini and returns the generated text.
     */
    public String generateContent(String prompt) {
        if (!isConfigured()) {
            throw new AiServiceException("Gemini API key is not configured. Set the GEMINI_API_KEY environment variable.");
        }

        try {
            JsonNode part = objectMapper.createObjectNode().put("text", prompt);
            JsonNode content = objectMapper.createObjectNode()
                .set("parts", objectMapper.createArrayNode().add(part));
            JsonNode requestBody = objectMapper.createObjectNode()
                .set("contents", objectMapper.createArrayNode().add(content));

            String uri = baseUrl + "/" + model + ":generateContent?key=" + apiKey;
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(uri))
                .timeout(Duration.ofSeconds(30))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                throw new AiServiceException("Gemini API returned status " + response.statusCode() + ": " + response.body());
            }

            return extractText(response.body());
        } catch (AiServiceException e) {
            throw e;
        } catch (Exception e) {
            throw new AiServiceException("Failed to call Gemini API: " + e.getMessage(), e);
        }
    }

    private String extractText(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode textNode = root.path("candidates").path(0).path("content").path("parts").path(0).path("text");
        if (textNode.isMissingNode() || textNode.isNull()) {
            throw new AiServiceException("Gemini API response did not contain any generated text.");
        }
        return textNode.asText();
    }
}
