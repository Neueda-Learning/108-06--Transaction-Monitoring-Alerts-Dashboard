package com.fbi.service;

import com.fbi.model.SdnEntry;
import com.fbi.util.StringSimilarityUtil;
import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Screens transaction payee names against the OFAC SDN (Specially Designated Nationals) list.
 *
 * The SDN list is loaded from sdn_list.txt into memory at startup.
 * Matching uses Jaro-Winkler fuzzy similarity with a configurable threshold.
 *
 * This is Phase 1 of the two-phase transaction processing pipeline:
 *   Phase 1 (pre-save): SDN screening → BLOCK if match found
 *   Phase 2 (post-save): Rule engine evaluation → flag if rules trigger
 */
@Service
public class SdnScreeningService {

    private static final Logger log = LoggerFactory.getLogger(SdnScreeningService.class);
    private static final String SDN_FILE = "sdn_list.txt";
    private static final double DEFAULT_THRESHOLD = 0.85;

    private List<SdnEntry> sdnEntries = Collections.emptyList();

    /**
     * Loads and parses the SDN list from the classpath resource file at startup.
     * Format: ID|Name|Type|Country|Remarks (lines starting with # are comments)
     */
    @PostConstruct
    void loadSdnList() {
        List<SdnEntry> entries = new ArrayList<>();

        try (InputStream is = getClass().getClassLoader().getResourceAsStream(SDN_FILE)) {
            if (is == null) {
                log.warn("SDN list file '{}' not found on classpath. SDN screening disabled.", SDN_FILE);
                return;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            String line;
            int lineNumber = 0;

            while ((line = reader.readLine()) != null) {
                lineNumber++;
                line = line.trim();

                // Skip empty lines and comments
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }

                String[] parts = line.split("\\|", -1);
                if (parts.length < 4) {
                    log.warn("SDN list line {} has invalid format, skipping: {}", lineNumber, line);
                    continue;
                }

                try {
                    SdnEntry entry = new SdnEntry(
                        Integer.parseInt(parts[0].trim()),
                        parts[1].trim(),
                        parts[2].trim(),
                        parts[3].trim(),
                        parts.length > 4 ? parts[4].trim() : ""
                    );
                    entries.add(entry);
                } catch (NumberFormatException e) {
                    log.warn("SDN list line {} has invalid ID, skipping: {}", lineNumber, line);
                }
            }
        } catch (IOException e) {
            log.error("Failed to load SDN list file: {}", e.getMessage());
        }

        this.sdnEntries = Collections.unmodifiableList(entries);
        log.info("Loaded {} SDN entries from {}", sdnEntries.size(), SDN_FILE);
    }

    /**
     * Screens a name against the SDN list using fuzzy matching.
     *
     * @param name the payee name to screen
     * @return the best matching result, or null if no match above threshold
     */
    public SdnMatchResult screen(String name) {
        return screen(name, DEFAULT_THRESHOLD);
    }

    /**
     * Screens a name against the SDN list with a custom similarity threshold.
     *
     * @param name      the payee name to screen
     * @param threshold minimum similarity score (0.0 to 1.0) to consider a match
     * @return the best matching result, or null if no match above threshold
     */
    public SdnMatchResult screen(String name, double threshold) {
        if (name == null || name.isBlank()) {
            return null;
        }

        SdnMatchResult bestMatch = null;

        for (SdnEntry entry : sdnEntries) {
            double score = StringSimilarityUtil.jaroWinklerSimilarity(name, entry.name());

            if (score >= threshold) {
                if (bestMatch == null || score > bestMatch.score()) {
                    bestMatch = new SdnMatchResult(entry, score);
                }
            }
        }

        return bestMatch;
    }

    /**
     * Searches for all SDN entries matching a name above the given threshold.
     * Useful for the SDN search API endpoint.
     *
     * @param name      the name to search for
     * @param threshold minimum similarity score
     * @return list of matching results, sorted by score descending
     */
    public List<SdnMatchResult> searchAll(String name, double threshold) {
        if (name == null || name.isBlank()) {
            return Collections.emptyList();
        }

        List<SdnMatchResult> results = new ArrayList<>();

        for (SdnEntry entry : sdnEntries) {
            double score = StringSimilarityUtil.jaroWinklerSimilarity(name, entry.name());
            if (score >= threshold) {
                results.add(new SdnMatchResult(entry, score));
            }
        }

        results.sort((a, b) -> Double.compare(b.score(), a.score()));
        return results;
    }

    /**
     * Returns the number of SDN entries currently loaded in memory.
     */
    public int getEntryCount() {
        return sdnEntries.size();
    }

    /**
     * Result of an SDN screening match.
     */
    public record SdnMatchResult(
        SdnEntry matchedEntry,
        double score
    ) {
    }
}
