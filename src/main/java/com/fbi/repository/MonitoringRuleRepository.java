package com.fbi.repository;

import com.fbi.model.MonitoringRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MonitoringRuleRepository extends JpaRepository<MonitoringRule, Long> {

    List<MonitoringRule> findByActiveTrue();
}

