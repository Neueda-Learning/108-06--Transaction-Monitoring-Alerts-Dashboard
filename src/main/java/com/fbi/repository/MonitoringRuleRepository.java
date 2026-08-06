package com.fbi.repository;

import com.fbi.model.MonitoringRule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface MonitoringRuleRepository extends JpaRepository<MonitoringRule, Long>, JpaSpecificationExecutor<MonitoringRule> {

    List<MonitoringRule> findByActiveTrue();
}

