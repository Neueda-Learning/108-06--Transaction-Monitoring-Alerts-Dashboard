package com.fbi.util;

/**
 * Utility for computing string similarity using the Jaro-Winkler algorithm.
 * Used for fuzzy matching transaction payee names against the OFAC SDN list.
 *
 * Jaro-Winkler gives higher scores to strings that match from the beginning,
 * which is ideal for name matching (e.g., "BANCO NACIONAL" vs "BANCO NACIONAL DE CUBA").
 *
 * Score range: 0.0 (no match) to 1.0 (exact match).
 * Typical threshold for SDN screening: 0.85 (85%).
 */
public final class StringSimilarityUtil {

    private static final double WINKLER_PREFIX_WEIGHT = 0.1;
    private static final int WINKLER_MAX_PREFIX = 4;

    private StringSimilarityUtil() {
    }

    /**
     * Computes the Jaro similarity between two strings.
     */
    public static double jaroSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) {
            return 0.0;
        }

        String a = s1.toUpperCase().trim();
        String b = s2.toUpperCase().trim();

        if (a.equals(b)) {
            return 1.0;
        }

        if (a.isEmpty() || b.isEmpty()) {
            return 0.0;
        }

        int matchWindow = Math.max(0, Math.max(a.length(), b.length()) / 2 - 1);

        boolean[] aMatched = new boolean[a.length()];
        boolean[] bMatched = new boolean[b.length()];

        int matches = 0;
        int transpositions = 0;

        // Find matching characters
        for (int i = 0; i < a.length(); i++) {
            int start = Math.max(0, i - matchWindow);
            int end = Math.min(i + matchWindow + 1, b.length());

            for (int j = start; j < end; j++) {
                if (bMatched[j] || a.charAt(i) != b.charAt(j)) {
                    continue;
                }
                aMatched[i] = true;
                bMatched[j] = true;
                matches++;
                break;
            }
        }

        if (matches == 0) {
            return 0.0;
        }

        // Count transpositions
        int k = 0;
        for (int i = 0; i < a.length(); i++) {
            if (!aMatched[i]) {
                continue;
            }
            while (!bMatched[k]) {
                k++;
            }
            if (a.charAt(i) != b.charAt(k)) {
                transpositions++;
            }
            k++;
        }

        double jaro = ((double) matches / a.length()
                + (double) matches / b.length()
                + (double) (matches - transpositions / 2.0) / matches) / 3.0;

        return jaro;
    }

    /**
     * Computes the Jaro-Winkler similarity between two strings.
     * Applies a bonus for common prefixes (up to 4 characters).
     *
     * @return similarity score between 0.0 and 1.0
     */
    public static double jaroWinklerSimilarity(String s1, String s2) {
        double jaro = jaroSimilarity(s1, s2);

        if (jaro <= 0.0) {
            return 0.0;
        }

        String a = s1.toUpperCase().trim();
        String b = s2.toUpperCase().trim();

        // Count common prefix (up to 4 chars)
        int prefix = 0;
        int limit = Math.min(WINKLER_MAX_PREFIX, Math.min(a.length(), b.length()));
        for (int i = 0; i < limit; i++) {
            if (a.charAt(i) == b.charAt(i)) {
                prefix++;
            } else {
                break;
            }
        }

        return jaro + (prefix * WINKLER_PREFIX_WEIGHT * (1.0 - jaro));
    }
}
