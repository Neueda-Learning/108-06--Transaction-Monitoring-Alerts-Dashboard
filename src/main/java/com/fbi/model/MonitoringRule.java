package com.fbi.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "monitoring_rules")
public class MonitoringRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RuleType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Severity severity;

    @Column(nullable = false)
    private boolean active;

    @Column(precision = 19, scale = 2)
    private BigDecimal amountThreshold;

    private Integer velocityCount;

    private Integer velocityWindowMinutes;

    @Column(precision = 19, scale = 2)
    private BigDecimal dailyLimit;

    public MonitoringRule() {
    }

    public MonitoringRule(Long id, String name, RuleType type, Severity severity, boolean active, BigDecimal amountThreshold, Integer velocityCount, Integer velocityWindowMinutes, BigDecimal dailyLimit) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.severity = severity;
        this.active = active;
        this.amountThreshold = amountThreshold;
        this.velocityCount = velocityCount;
        this.velocityWindowMinutes = velocityWindowMinutes;
        this.dailyLimit = dailyLimit;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public RuleType getType() {
        return type;
    }

    public void setType(RuleType type) {
        this.type = type;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public BigDecimal getAmountThreshold() {
        return amountThreshold;
    }

    public void setAmountThreshold(BigDecimal amountThreshold) {
        this.amountThreshold = amountThreshold;
    }

    public Integer getVelocityCount() {
        return velocityCount;
    }

    public void setVelocityCount(Integer velocityCount) {
        this.velocityCount = velocityCount;
    }

    public Integer getVelocityWindowMinutes() {
        return velocityWindowMinutes;
    }

    public void setVelocityWindowMinutes(Integer velocityWindowMinutes) {
        this.velocityWindowMinutes = velocityWindowMinutes;
    }

    public BigDecimal getDailyLimit() {
        return dailyLimit;
    }

    public void setDailyLimit(BigDecimal dailyLimit) {
        this.dailyLimit = dailyLimit;
    }
}

