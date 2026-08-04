package com.fbi.service;

import com.fbi.service.SdnScreeningService.SdnMatchResult;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for the SDN Screening Service.
 * Validates file loading, exact matching, fuzzy matching, and no-match scenarios.
 */
@SpringBootTest
class SdnScreeningServiceTest {

    @Autowired
    private SdnScreeningService sdnScreeningService;

    @Test
    void sdnListShouldBeLoaded() {
        assertThat(sdnScreeningService.getEntryCount()).isGreaterThan(0);
    }

    @Test
    void exactSdnName_shouldMatch() {
        SdnMatchResult result = sdnScreeningService.screen("BANCO NACIONAL DE CUBA");
        assertThat(result).isNotNull();
        assertThat(result.score()).isEqualTo(1.0);
        assertThat(result.matchedEntry().country()).isEqualTo("CUBA");
    }

    @Test
    void similarSdnName_shouldFuzzyMatch() {
        // Slight variation - should still match above 0.85
        SdnMatchResult result = sdnScreeningService.screen("BANCO NACIONAL");
        assertThat(result).isNotNull();
        assertThat(result.score()).isGreaterThan(0.85);
    }

    @Test
    void cleanName_shouldNotMatch() {
        SdnMatchResult result = sdnScreeningService.screen("Starbucks Coffee Shop");
        assertThat(result).isNull();
    }

    @Test
    void searchAll_shouldReturnMultipleMatches() {
        // "CIMEX" should match multiple entries (CIMEX, CIMEX IBERICA, CIMEX S.A.)
        List<SdnMatchResult> results = sdnScreeningService.searchAll("CIMEX", 0.80);
        assertThat(results).hasSizeGreaterThan(1);
        // Results should be sorted by score descending
        for (int i = 0; i < results.size() - 1; i++) {
            assertThat(results.get(i).score()).isGreaterThanOrEqualTo(results.get(i + 1).score());
        }
    }

    @Test
    void blankName_shouldReturnNull() {
        assertThat(sdnScreeningService.screen("")).isNull();
        assertThat(sdnScreeningService.screen("   ")).isNull();
    }
}
