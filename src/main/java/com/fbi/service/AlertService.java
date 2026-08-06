package com.fbi.service;

import com.fbi.dto.AlertHistoryEntry;
import com.fbi.dto.AlertInvestigationResponse;
import com.fbi.dto.AlertNoteResponse;
import com.fbi.exception.BadRequestException;
import com.fbi.exception.NotFoundException;
import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import com.fbi.model.AlertNote;
import com.fbi.model.MonitoredTransaction;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.AlertNoteRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

@Service
public class AlertService {

    private final AlertRepository alertRepository;
    private final AlertNoteRepository alertNoteRepository;
    private final MonitoredTransactionRepository transactionRepository;

    public AlertService(
        AlertRepository alertRepository,
        AlertNoteRepository alertNoteRepository,
        MonitoredTransactionRepository transactionRepository
    ) {
        this.alertRepository = alertRepository;
        this.alertNoteRepository = alertNoteRepository;
        this.transactionRepository = transactionRepository;
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

    public Page<Alert> getAlertsPaged(AlertStatus status, Severity severity, String search, Pageable pageable) {
        return alertRepository.findAll(buildSearchSpecification(status, severity, search), pageable);
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

    public List<AlertHistoryEntry> getAlertHistory(Long id) {
        Alert alert = getById(id);
        List<AlertHistoryEntry> history = new java.util.ArrayList<>();

        if (alert.getCreatedAt() != null) {
            history.add(new AlertHistoryEntry(AlertStatus.OPEN, alert.getCreatedAt(), "Alert created"));
        }
        if (alert.getAcknowledgedAt() != null) {
            history.add(new AlertHistoryEntry(AlertStatus.ACKNOWLEDGED, alert.getAcknowledgedAt(), alert.getLifecycleNote()));
        }
        if (alert.getInvestigatingAt() != null) {
            history.add(new AlertHistoryEntry(AlertStatus.INVESTIGATING, alert.getInvestigatingAt(), alert.getLifecycleNote()));
        }
        if (alert.getClosedAt() != null) {
            history.add(new AlertHistoryEntry(AlertStatus.CLOSED, alert.getClosedAt(), alert.getLifecycleNote()));
        }
        if (alert.getDismissedAt() != null) {
            history.add(new AlertHistoryEntry(AlertStatus.DISMISSED, alert.getDismissedAt(), alert.getLifecycleNote()));
        }

        history.sort(java.util.Comparator.comparing(AlertHistoryEntry::timestamp));
        return history;
    }

    public AlertNoteResponse addNote(Long alertId, String note) {
        getById(alertId);
        String normalized = note == null ? "" : note.trim();
        if (normalized.isEmpty()) {
            throw new BadRequestException("note must not be blank");
        }

        AlertNote alertNote = new AlertNote();
        alertNote.setAlertId(alertId);
        alertNote.setNote(normalized);
        AlertNote saved = alertNoteRepository.save(alertNote);

        return new AlertNoteResponse(saved.getId(), saved.getAlertId(), saved.getNote(), saved.getCreatedAt());
    }

    public AlertInvestigationResponse investigateAlert(Long alertId, boolean persistToLifecycleNote) {
        Alert alert = getById(alertId);
        MonitoredTransaction transaction = transactionRepository.findById(alert.getTransactionId())
            .orElse(null);

        List<com.fbi.model.AlertNote> notes = alertNoteRepository.findByAlertIdOrderByCreatedAtAsc(alertId);
        String riskLevel = switch (alert.getSeverity()) {
            case CRITICAL -> "VERY_HIGH";
            case HIGH -> "HIGH";
            case MEDIUM -> "MEDIUM";
            case LOW -> "LOW";
        };

        List<String> findings = new ArrayList<>();
        findings.add("Rule triggered: " + alert.getRuleName() + " (" + alert.getRuleType() + ")");
        findings.add("Current status: " + alert.getStatus());
        findings.add("Severity assessment: " + alert.getSeverity());

        if (transaction != null) {
            findings.add("Transaction amount: " + transaction.getAmount() + " " + transaction.getCurrency());
            findings.add("Account: " + transaction.getAccountId() + ", Payee: " + transaction.getPayeeId());
            if (transaction.getCountry() != null && !transaction.getCountry().isBlank()) {
                findings.add("Destination country: " + transaction.getCountry());
            }
        } else {
            findings.add("Associated transaction record is not available.");
        }

        findings.add("Analyst note count: " + notes.size());

        String summary = "Investigation generated for alert " + alertId + ": "
            + "rule='" + alert.getRuleName() + "', severity=" + alert.getSeverity()
            + ", status=" + alert.getStatus()
            + ", notes=" + notes.size() + ".";

        if (persistToLifecycleNote) {
            alert.setLifecycleNote(summary);
            alertRepository.save(alert);
        }

        return new AlertInvestigationResponse(
            alert.getId(),
            alert.getStatus(),
            alert.getSeverity(),
            riskLevel,
            summary,
            findings,
            notes.size(),
            Instant.now(),
            persistToLifecycleNote
        );
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

    private Specification<Alert> buildSearchSpecification(AlertStatus status, Severity severity, String search) {
        return (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (severity != null) {
                predicates.add(cb.equal(root.get("severity"), severity));
            }
            if (search != null && !search.isBlank()) {
                String like = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("ruleName")), like),
                    cb.like(cb.lower(root.get("ruleType").as(String.class)), like),
                    cb.like(cb.lower(root.get("severity").as(String.class)), like),
                    cb.like(cb.lower(root.get("status").as(String.class)), like),
                    cb.like(cb.lower(root.get("accountId")), like),
                    cb.like(root.get("transactionId").as(String.class), like),
                    cb.like(root.get("id").as(String.class), like)
                ));
            }
            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }
}

