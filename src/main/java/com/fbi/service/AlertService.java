package com.fbi.service;

import com.fbi.exception.BadRequestException;
import com.fbi.exception.NotFoundException;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import com.fbi.repository.AlertRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AlertService {

    private final AlertRepository alertRepository;

    public AlertService(AlertRepository alertRepository) {
        this.alertRepository = alertRepository;
    }

    public List<Alert> getAlerts(AlertStatus status, Severity severity) {
        if (status != null && severity != null) {
            return alertRepository.findByStatusAndSeverity(status, severity);
        }
        if (status != null) {
            return alertRepository.findByStatus(status);
        }
        if (severity != null) {
            return alertRepository.findBySeverity(severity);
        }
        return alertRepository.findAll();
    }

    public Alert getById(Long id) {
        return alertRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Alert not found: " + id));
    }

    public Alert updateStatus(Long id, AlertStatus targetStatus, String note) {
        Alert alert = getById(id);
        validateTransition(alert.getStatus(), targetStatus);
        alert.setStatus(targetStatus);
        alert.setLifecycleNote(note);
        Instant now = Instant.now();
        switch (targetStatus) {
            case ACKNOWLEDGED -> alert.setAcknowledgedAt(now);
            case INVESTIGATING -> alert.setInvestigatingAt(now);
            case CLOSED -> alert.setClosedAt(now);
            case DISMISSED -> alert.setDismissedAt(now);
            case OPEN -> {
                throw new BadRequestException("Cannot move alert back to OPEN");
            }
        }
        return alertRepository.save(alert);
    }

    private void validateTransition(AlertStatus current, AlertStatus target) {
        boolean valid = switch (current) {
            case OPEN -> target == AlertStatus.ACKNOWLEDGED || target == AlertStatus.DISMISSED;
            case ACKNOWLEDGED -> target == AlertStatus.INVESTIGATING || target == AlertStatus.DISMISSED;
            case INVESTIGATING -> target == AlertStatus.CLOSED || target == AlertStatus.DISMISSED;
            case CLOSED, DISMISSED -> false;
        };
        if (!valid) {
            throw new BadRequestException("Invalid alert status transition: " + current + " -> " + target);
        }
    }
}

