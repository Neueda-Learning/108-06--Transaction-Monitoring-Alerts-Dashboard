package com.fbi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long transactionId;

    @Column(nullable = false, length = 64)
    private String accountId;

    @Column(nullable = false)
    private Long ruleId;

    @Column(nullable = false)
    private String ruleName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RuleType ruleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private AlertStatus status;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(length = 1000)
    private String lifecycleNote;

    @Column(nullable = false)
    private Instant createdAt;

    private Instant acknowledgedAt;

    private Instant investigatingAt;

    private Instant closedAt;

    private Instant dismissedAt;

    public Alert() {
    }

    public Alert(Long id, Long transactionId, String accountId, Long ruleId, String ruleName, RuleType ruleType, Severity severity, AlertStatus status, String message, String lifecycleNote, Instant createdAt, Instant acknowledgedAt, Instant investigatingAt, Instant closedAt, Instant dismissedAt) {
        this.id = id;
        this.transactionId = transactionId;
        this.accountId = accountId;
        this.ruleId = ruleId;
        this.ruleName = ruleName;
        this.ruleType = ruleType;
        this.severity = severity;
        this.status = status;
        this.message = message;
        this.lifecycleNote = lifecycleNote;
        this.createdAt = createdAt;
        this.acknowledgedAt = acknowledgedAt;
        this.investigatingAt = investigatingAt;
        this.closedAt = closedAt;
        this.dismissedAt = dismissedAt;
    }

    @PrePersist
    void initTimestamps() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (status == null) {
            status = AlertStatus.OPEN;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(Long transactionId) {
        this.transactionId = transactionId;
    }

    public String getAccountId() {
        return accountId;
    }

    public void setAccountId(String accountId) {
        this.accountId = accountId;
    }

    public Long getRuleId() {
        return ruleId;
    }

    public void setRuleId(Long ruleId) {
        this.ruleId = ruleId;
    }

    public String getRuleName() {
        return ruleName;
    }

    public void setRuleName(String ruleName) {
        this.ruleName = ruleName;
    }

    public RuleType getRuleType() {
        return ruleType;
    }

    public void setRuleType(RuleType ruleType) {
        this.ruleType = ruleType;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    public AlertStatus getStatus() {
        return status;
    }

    public void setStatus(AlertStatus status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getLifecycleNote() {
        return lifecycleNote;
    }

    public void setLifecycleNote(String lifecycleNote) {
        this.lifecycleNote = lifecycleNote;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getAcknowledgedAt() {
        return acknowledgedAt;
    }

    public void setAcknowledgedAt(Instant acknowledgedAt) {
        this.acknowledgedAt = acknowledgedAt;
    }

    public Instant getInvestigatingAt() {
        return investigatingAt;
    }

    public void setInvestigatingAt(Instant investigatingAt) {
        this.investigatingAt = investigatingAt;
    }

    public Instant getClosedAt() {
        return closedAt;
    }

    public void setClosedAt(Instant closedAt) {
        this.closedAt = closedAt;
    }

    public Instant getDismissedAt() {
        return dismissedAt;
    }

    public void setDismissedAt(Instant dismissedAt) {
        this.dismissedAt = dismissedAt;
    }
}

