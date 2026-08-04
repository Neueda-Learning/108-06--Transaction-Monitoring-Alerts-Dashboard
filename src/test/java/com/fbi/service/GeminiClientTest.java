package com.fbi.service;

import com.fbi.exception.AiServiceException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for GeminiClient configuration guard rails. No real network
 * calls are made - the API key is never hardcoded, only read from config.
 */
class GeminiClientTest {

    @Test
    void generateContent_throwsWhenApiKeyIsBlank() {
        GeminiClient client = new GeminiClient("", "gemini-2.0-flash", "https://example.invalid/models");

        assertThatThrownBy(() -> client.generateContent("hello"))
            .isInstanceOf(AiServiceException.class)
            .hasMessageContaining("GEMINI_API_KEY");
    }

    @Test
    void isConfigured_falseWhenKeyBlank() {
        GeminiClient client = new GeminiClient("   ", "gemini-2.0-flash", "https://example.invalid/models");

        assertThatThrownBy(() -> client.generateContent("hello"))
            .isInstanceOf(AiServiceException.class);
    }
}
