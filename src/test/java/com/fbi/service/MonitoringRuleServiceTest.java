package com.fbi.service;

import com.fbi.dto.MonitoringRuleRequest;
import com.fbi.exception.BadRequestException;
import com.fbi.exception.NotFoundException;
import com.fbi.model.MonitoringRule;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.repository.MonitoringRuleRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MonitoringRuleServiceTest {

    @Mock
    private MonitoringRuleRepository monitoringRuleRepository;

    private MonitoringRuleService monitoringRuleService;

    @BeforeEach
    void setUp() {
        monitoringRuleService = new MonitoringRuleService(monitoringRuleRepository);
    }

    private MonitoringRule sampleRule() {
        MonitoringRule rule = new MonitoringRule();
        rule.setId(1L);
        rule.setName("High Amount > 10000");
        rule.setType(RuleType.AMOUNT_THRESHOLD);
        rule.setSeverity(Severity.HIGH);
        rule.setActive(true);
        rule.setAmountThreshold(new BigDecimal("10000"));
        return rule;
    }

    @Test
    void getAll_returnsAllRules() {
        when(monitoringRuleRepository.findAll()).thenReturn(List.of(sampleRule()));

        assertThat(monitoringRuleService.getAll()).hasSize(1);
    }

    @Test
    void getById_throwsWhenMissing() {
        when(monitoringRuleRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> monitoringRuleService.getById(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void create_amountThreshold_savesRule() {
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            " High Amount ", RuleType.AMOUNT_THRESHOLD, Severity.HIGH, true,
            new BigDecimal("10000"), null, null, null
        );
        when(monitoringRuleRepository.save(any(MonitoringRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MonitoringRule created = monitoringRuleService.create(request);

        assertThat(created.getName()).isEqualTo("High Amount");
        assertThat(created.getAmountThreshold()).isEqualByComparingTo("10000");
    }

    @Test
    void create_amountThreshold_missingThreshold_throwsBadRequest() {
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "Rule", RuleType.AMOUNT_THRESHOLD, Severity.HIGH, true, null, null, null, null
        );

        assertThatThrownBy(() -> monitoringRuleService.create(request)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_velocity_missingFields_throwsBadRequest() {
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "Rule", RuleType.VELOCITY, Severity.MEDIUM, true, null, null, null, null
        );

        assertThatThrownBy(() -> monitoringRuleService.create(request)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_velocity_withFields_succeeds() {
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "Velocity Rule", RuleType.VELOCITY, Severity.MEDIUM, true, null, 5, 10, null
        );
        when(monitoringRuleRepository.save(any(MonitoringRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MonitoringRule created = monitoringRuleService.create(request);

        assertThat(created.getVelocityCount()).isEqualTo(5);
        assertThat(created.getVelocityWindowMinutes()).isEqualTo(10);
    }

    @Test
    void create_dailyLimit_missingLimit_throwsBadRequest() {
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "Rule", RuleType.DAILY_LIMIT, Severity.HIGH, true, null, null, null, null
        );

        assertThatThrownBy(() -> monitoringRuleService.create(request)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void create_newPayee_requiresNoAdditionalFields() {
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "New Payee Rule", RuleType.NEW_PAYEE, Severity.MEDIUM, true, null, null, null, null
        );
        when(monitoringRuleRepository.save(any(MonitoringRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MonitoringRule created = monitoringRuleService.create(request);

        assertThat(created.getType()).isEqualTo(RuleType.NEW_PAYEE);
    }

    @Test
    void update_existingRule_updatesFieldsAndSaves() {
        MonitoringRule existing = sampleRule();
        when(monitoringRuleRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(monitoringRuleRepository.save(any(MonitoringRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "Updated Rule", RuleType.AMOUNT_THRESHOLD, Severity.CRITICAL, false,
            new BigDecimal("20000"), null, null, null
        );

        MonitoringRule updated = monitoringRuleService.update(1L, request);

        assertThat(updated.getName()).isEqualTo("Updated Rule");
        assertThat(updated.getSeverity()).isEqualTo(Severity.CRITICAL);
        assertThat(updated.isActive()).isFalse();
    }

    @Test
    void update_missingRule_throwsNotFound() {
        when(monitoringRuleRepository.findById(99L)).thenReturn(Optional.empty());
        MonitoringRuleRequest request = new MonitoringRuleRequest(
            "Rule", RuleType.NEW_PAYEE, Severity.LOW, true, null, null, null, null
        );

        assertThatThrownBy(() -> monitoringRuleService.update(99L, request)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void toggleActive_flipsActiveFlag() {
        MonitoringRule existing = sampleRule();
        existing.setActive(true);
        when(monitoringRuleRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(monitoringRuleRepository.save(any(MonitoringRule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        MonitoringRule toggled = monitoringRuleService.toggleActive(1L);

        assertThat(toggled.isActive()).isFalse();
    }

    @Test
    void delete_existingRule_deletesById() {
        when(monitoringRuleRepository.existsById(1L)).thenReturn(true);

        monitoringRuleService.delete(1L);

        org.mockito.Mockito.verify(monitoringRuleRepository).deleteById(1L);
    }

    @Test
    void delete_missingRule_throwsNotFound() {
        when(monitoringRuleRepository.existsById(99L)).thenReturn(false);

        assertThatThrownBy(() -> monitoringRuleService.delete(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void getActiveRules_delegatesToRepository() {
        when(monitoringRuleRepository.findByActiveTrue()).thenReturn(List.of(sampleRule()));

        assertThat(monitoringRuleService.getActiveRules()).hasSize(1);
    }
}
