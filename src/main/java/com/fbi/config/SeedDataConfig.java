package com.fbi.config;

import com.fbi.model.MonitoringRule;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.repository.MonitoringRuleRepository;
import java.math.BigDecimal;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SeedDataConfig {

    private final MonitoringRuleRepository monitoringRuleRepository;

    public SeedDataConfig(MonitoringRuleRepository monitoringRuleRepository) {
        this.monitoringRuleRepository = monitoringRuleRepository;
    }

    @Bean
    CommandLineRunner seedRules() {
        return args -> {
            if (monitoringRuleRepository.count() > 0) {
                return;
            }

            monitoringRuleRepository.save(createRule("High Amount > 10000", RuleType.AMOUNT_THRESHOLD, Severity.HIGH, new BigDecimal("10000.00"), null, null, null));
            monitoringRuleRepository.save(createRule("Velocity > 5 in 10 min", RuleType.VELOCITY, Severity.MEDIUM, null, 5, 10, null));
            monitoringRuleRepository.save(createRule("New Payee", RuleType.NEW_PAYEE, Severity.MEDIUM, null, null, null, null));
            monitoringRuleRepository.save(createRule("Daily Limit > 50000", RuleType.DAILY_LIMIT, Severity.HIGH, null, null, null, new BigDecimal("50000.00")));
        };
    }

    private MonitoringRule createRule(String name, RuleType type, Severity severity, BigDecimal amountThreshold, Integer velocityCount, Integer velocityWindowMinutes, BigDecimal dailyLimit) {
        MonitoringRule rule = new MonitoringRule();
        rule.setName(name);
        rule.setType(type);
        rule.setSeverity(severity);
        rule.setActive(true);
        rule.setAmountThreshold(amountThreshold);
        rule.setVelocityCount(velocityCount);
        rule.setVelocityWindowMinutes(velocityWindowMinutes);
        rule.setDailyLimit(dailyLimit);
        return rule;
    }
}

