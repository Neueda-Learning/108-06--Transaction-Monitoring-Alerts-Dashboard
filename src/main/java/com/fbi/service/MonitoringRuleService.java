package com.fbi.service;

import com.fbi.dto.MonitoringRuleRequest;
import com.fbi.exception.BadRequestException;
import com.fbi.exception.NotFoundException;
import com.fbi.model.MonitoringRule;
import com.fbi.model.RuleType;
import com.fbi.repository.MonitoringRuleRepository;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
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

    public Page<MonitoringRule> getAllPaged(String search, Pageable pageable) {
        return monitoringRuleRepository.findAll(buildSearchSpecification(search), pageable);
    }

    public MonitoringRule getById(Long id) {
        return monitoringRuleRepository.findById(id)
            .orElseThrow(() -> new NotFoundException("Rule not found: " + id));
    }

    public MonitoringRule create(MonitoringRuleRequest request) {
        validateRequest(request);
        rejectDuplicate(request, null);
        MonitoringRule rule = new MonitoringRule();
        updateEntity(rule, request);
        return monitoringRuleRepository.save(rule);
    }

    public MonitoringRule update(Long id, MonitoringRuleRequest request) {
        validateRequest(request);
        rejectDuplicate(request, id);
        MonitoringRule rule = getById(id);
        updateEntity(rule, request);
        return monitoringRuleRepository.save(rule);
    }

    public MonitoringRule toggleActive(Long id) {
        MonitoringRule rule = getById(id);
        rule.setActive(!rule.isActive());
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

    private void rejectDuplicate(MonitoringRuleRequest request, Long excludeId) {
        boolean duplicateExists = monitoringRuleRepository.findAll().stream()
            .filter(existing -> excludeId == null || !existing.getId().equals(excludeId))
            .anyMatch(existing -> isSameConfiguration(existing, request));
        if (duplicateExists) {
            throw new BadRequestException("A rule with the same configuration already exists");
        }
    }

    private boolean isSameConfiguration(MonitoringRule existing, MonitoringRuleRequest request) {
        return existing.getType() == request.type()
            && existing.getSeverity() == request.severity()
            && existing.isActive() == request.active()
            && isSameAmount(existing.getAmountThreshold(), request.amountThreshold())
            && java.util.Objects.equals(existing.getVelocityCount(), request.velocityCount())
            && java.util.Objects.equals(existing.getVelocityWindowMinutes(), request.velocityWindowMinutes())
            && isSameAmount(existing.getDailyLimit(), request.dailyLimit());
    }

    private boolean isSameAmount(java.math.BigDecimal left, java.math.BigDecimal right) {
        if (left == null || right == null) {
            return left == right;
        }
        return left.compareTo(right) == 0;
    }

    private Specification<MonitoringRule> buildSearchSpecification(String search) {
        return (root, query, cb) -> {
            if (search == null || search.isBlank()) {
                return cb.conjunction();
            }

            String normalized = search.trim().toLowerCase();
            String like = "%" + normalized + "%";
            boolean activeMatch = "active".contains(normalized);
            boolean inactiveMatch = "inactive".contains(normalized);

            return cb.or(
                cb.like(cb.lower(root.get("name")), like),
                cb.like(cb.lower(root.get("type").as(String.class)), like),
                cb.like(cb.lower(root.get("severity").as(String.class)), like),
                activeMatch ? cb.isTrue(root.get("active")) : cb.disjunction(),
                inactiveMatch ? cb.isFalse(root.get("active")) : cb.disjunction(),
                cb.like(root.get("id").as(String.class), like)
            );
        };
    }
}
