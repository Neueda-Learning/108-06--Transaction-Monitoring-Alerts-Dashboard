package com.fbi.service;

import com.fbi.dto.MonitoringRuleRequest;
import com.fbi.exception.BadRequestException;
import com.fbi.exception.NotFoundException;
import com.fbi.model.MonitoringRule;
import com.fbi.model.RuleType;
import com.fbi.repository.MonitoringRuleRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MonitoringRuleService {

    private final MonitoringRuleRepository monitoringRuleRepository;

    public MonitoringRuleService(MonitoringRuleRepository monitoringRuleRepository) {
        this.monitoringRuleRepository = monitoringRuleRepository;
    }

    public List<MonitoringRule> getAll() {
        return monitoringRuleRepository.findAll();
    }

    public MonitoringRule getById(Long id) {
        return monitoringRuleRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Rule not found: " + id));
    }

    public MonitoringRule create(MonitoringRuleRequest request) {
        validateRequest(request);
        MonitoringRule rule = new MonitoringRule();
        updateEntity(rule, request);
        return monitoringRuleRepository.save(rule);
    }

    public MonitoringRule update(Long id, MonitoringRuleRequest request) {
        validateRequest(request);
        MonitoringRule rule = getById(id);
        updateEntity(rule, request);
        return monitoringRuleRepository.save(rule);
    }

    public void delete(Long id) {
        if (!monitoringRuleRepository.existsById(id)) {
            throw new NotFoundException("Rule not found: " + id);
        }
        monitoringRuleRepository.deleteById(id);
    }

    public List<MonitoringRule> getActiveRules() {
        return monitoringRuleRepository.findByActiveTrue();
    }

    private void updateEntity(MonitoringRule rule, MonitoringRuleRequest request) {
        rule.setName(request.name().trim());
        rule.setType(request.type());
        rule.setSeverity(request.severity());
        rule.setActive(request.active());
        rule.setAmountThreshold(request.amountThreshold());
        rule.setVelocityCount(request.velocityCount());
        rule.setVelocityWindowMinutes(request.velocityWindowMinutes());
        rule.setDailyLimit(request.dailyLimit());
    }

    private void validateRequest(MonitoringRuleRequest request) {
        RuleType type = request.type();
        if (type == RuleType.AMOUNT_THRESHOLD && request.amountThreshold() == null) {
            throw new BadRequestException("amountThreshold is required for AMOUNT_THRESHOLD rules");
        }
        if (type == RuleType.VELOCITY && (request.velocityCount() == null || request.velocityWindowMinutes() == null)) {
            throw new BadRequestException("velocityCount and velocityWindowMinutes are required for VELOCITY rules");
        }
        if (type == RuleType.DAILY_LIMIT && request.dailyLimit() == null) {
            throw new BadRequestException("dailyLimit is required for DAILY_LIMIT rules");
        }
    }
}

