package com.fbi.util;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests for the Jaro-Winkler string similarity algorithm.
 * Validates exact matches, partial matches, no matches, and edge cases.
 */
class StringSimilarityUtilTest {

    @Test
    void exactMatch_shouldReturnOne() {
        double score = StringSimilarityUtil.jaroWinklerSimilarity("BANCO NACIONAL", "BANCO NACIONAL");
        assertThat(score).isEqualTo(1.0);
    }

    @Test
    void caseInsensitive_shouldMatchRegardlessOfCase() {
        double score = StringSimilarityUtil.jaroWinklerSimilarity("banco nacional", "BANCO NACIONAL");
        assertThat(score).isEqualTo(1.0);
    }

    @Test
    void partialMatch_shouldReturnHighScore() {
        // "BANCO NACIONAL" vs "BANCO NACIONAL DE CUBA" - shares a long prefix
        double score = StringSimilarityUtil.jaroWinklerSimilarity("BANCO NACIONAL", "BANCO NACIONAL DE CUBA");
        assertThat(score).isGreaterThan(0.85);
    }

    @Test
    void completelyDifferent_shouldReturnLowScore() {
        double score = StringSimilarityUtil.jaroWinklerSimilarity("Starbucks Coffee", "BANCO NACIONAL DE CUBA");
        assertThat(score).isLessThan(0.50);
    }

    @Test
    void similarNames_shouldReturnMediumScore() {
        // Similar but not the same entity
        double score = StringSimilarityUtil.jaroWinklerSimilarity("CIMEX", "CIMEX IBERICA");
        assertThat(score).isGreaterThan(0.80);
    }

    @Test
    void nullInput_shouldReturnZero() {
        assertThat(StringSimilarityUtil.jaroWinklerSimilarity(null, "test")).isEqualTo(0.0);
        assertThat(StringSimilarityUtil.jaroWinklerSimilarity("test", null)).isEqualTo(0.0);
        assertThat(StringSimilarityUtil.jaroWinklerSimilarity(null, null)).isEqualTo(0.0);
    }

    @Test
    void emptyString_shouldReturnZero() {
        assertThat(StringSimilarityUtil.jaroWinklerSimilarity("", "test")).isEqualTo(0.0);
        assertThat(StringSimilarityUtil.jaroWinklerSimilarity("test", "")).isEqualTo(0.0);
    }

    @Test
    void jaroSimilarity_shouldBeLowerThanJaroWinkler_forCommonPrefix() {
        // Jaro-Winkler boosts score for common prefixes
        double jaro = StringSimilarityUtil.jaroSimilarity("CIMEX", "CIMEX, S.A.");
        double jaroWinkler = StringSimilarityUtil.jaroWinklerSimilarity("CIMEX", "CIMEX, S.A.");
        assertThat(jaroWinkler).isGreaterThanOrEqualTo(jaro);
    }
}
