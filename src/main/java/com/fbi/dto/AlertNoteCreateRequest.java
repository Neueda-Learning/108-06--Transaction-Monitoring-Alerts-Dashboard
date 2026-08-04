package com.fbi.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlertNoteCreateRequest(
    @NotBlank @Size(max = 1000) String note
) {
}

