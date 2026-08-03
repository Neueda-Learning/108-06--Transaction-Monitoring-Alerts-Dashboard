package com.fbi.model;

/**
 * Represents a single entry from the OFAC SDN (Specially Designated Nationals) list.
 * This is an in-memory record parsed from sdn_list.txt — NOT a JPA entity.
 * SDN data is loaded once at startup and held in memory for fast screening.
 */
public record SdnEntry(
    int id,
    String name,
    String type,
    String country,
    String remarks
) {
}
