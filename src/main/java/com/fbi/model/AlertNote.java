package com.fbi.model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
@Entity
@Table(name = "alert_notes")
public class AlertNote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Long alertId;
    @Column(nullable = false, length = 1000)
    private String note;
    @Column(nullable = false)
    private Instant createdAt;
    @PrePersist
    void initCreatedAt() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public Long getAlertId() {
        return alertId;
    }
    public void setAlertId(Long alertId) {
        this.alertId = alertId;
    }
    public String getNote() {
        return note;
    }
    public void setNote(String note) {
        this.note = note;
    }
    public Instant getCreatedAt() {
        return createdAt;
    }
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
