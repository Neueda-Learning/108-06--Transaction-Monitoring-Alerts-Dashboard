package com.fbi.repository;

import com.fbi.model.Alert;
import com.fbi.model.AlertStatus;
import com.fbi.model.Severity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    List<Alert> findByStatus(AlertStatus status);

    List<Alert> findByStatusAndSeverity(AlertStatus status, Severity severity);

    List<Alert> findBySeverity(Severity severity);
}

