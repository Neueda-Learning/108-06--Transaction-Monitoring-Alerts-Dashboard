package com.fbi.service;

import com.fbi.dto.AlertHistoryEntry;
import com.fbi.dto.AlertInvestigationResponse;
import com.fbi.dto.AlertNoteResponse;
import com.fbi.exception.BadRequestException;
import com.fbi.exception.NotFoundException;
import com.fbi.model.Alert;
import com.fbi.model.AlertNote;
import com.fbi.model.AlertStatus;
import com.fbi.model.MonitoredTransaction;
import com.fbi.model.RuleType;
import com.fbi.model.Severity;
import com.fbi.repository.AlertNoteRepository;
import com.fbi.repository.AlertRepository;
import com.fbi.repository.MonitoredTransactionRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;
    @Mock
    private AlertNoteRepository alertNoteRepository;
    @Mock
    private MonitoredTransactionRepository transactionRepository;

    private AlertService alertService;

    @BeforeEach
    void setUp() {
        alertService = new AlertService(alertRepository, alertNoteRepository, transactionRepository);
    }

    private Alert sampleAlert(AlertStatus status) {
        Alert alert = new Alert();
        alert.setId(1L);
        alert.setTransactionId(10L);
        alert.setAccountId("ACC-1");
        alert.setRuleId(2L);
        alert.setRuleName("High Amount");
        alert.setRuleType(RuleType.AMOUNT_THRESHOLD);
        alert.setSeverity(Severity.HIGH);
        alert.setStatus(status);
        alert.setMessage("Threshold breached");
        alert.setCreatedAt(Instant.now());
        return alert;
    }

    @Test
    void getAlerts_filtersByStatusAndSeverity() {
        when(alertRepository.findByStatusAndSeverity(AlertStatus.OPEN, Severity.HIGH))
            .thenReturn(List.of(sampleAlert(AlertStatus.OPEN)));

        List<Alert> result = alertService.getAlerts(AlertStatus.OPEN, Severity.HIGH);

        assertThat(result).hasSize(1);
    }

    @Test
    void getAlerts_filtersByStatusOnly() {
        when(alertRepository.findByStatus(AlertStatus.OPEN)).thenReturn(List.of(sampleAlert(AlertStatus.OPEN)));

        List<Alert> result = alertService.getAlerts(AlertStatus.OPEN, null);

        assertThat(result).hasSize(1);
    }

    @Test
    void getAlerts_filtersBySeverityOnly() {
        when(alertRepository.findBySeverity(Severity.HIGH)).thenReturn(List.of(sampleAlert(AlertStatus.OPEN)));

        List<Alert> result = alertService.getAlerts(null, Severity.HIGH);

        assertThat(result).hasSize(1);
    }

    @Test
    void getAlerts_returnsAllWhenNoFilters() {
        when(alertRepository.findAll()).thenReturn(List.of(sampleAlert(AlertStatus.OPEN)));

        List<Alert> result = alertService.getAlerts(null, null);

        assertThat(result).hasSize(1);
    }

    @Test
    void getById_throwsWhenNotFound() {
        when(alertRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> alertService.getById(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void updateStatus_openToAcknowledged_setsTimestampAndSaves() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Alert updated = alertService.updateStatus(1L, AlertStatus.ACKNOWLEDGED, "reviewing");

        assertThat(updated.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
        assertThat(updated.getAcknowledgedAt()).isNotNull();
        assertThat(updated.getLifecycleNote()).isEqualTo("reviewing");
    }

    @Test
    void updateStatus_acknowledgedToInvestigating_setsTimestamp() {
        Alert alert = sampleAlert(AlertStatus.ACKNOWLEDGED);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Alert updated = alertService.updateStatus(1L, AlertStatus.INVESTIGATING, null);

        assertThat(updated.getInvestigatingAt()).isNotNull();
    }

    @Test
    void updateStatus_investigatingToClosed_setsTimestamp() {
        Alert alert = sampleAlert(AlertStatus.INVESTIGATING);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Alert updated = alertService.updateStatus(1L, AlertStatus.CLOSED, null);

        assertThat(updated.getClosedAt()).isNotNull();
    }

    @Test
    void updateStatus_toDismissed_setsTimestamp() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Alert updated = alertService.updateStatus(1L, AlertStatus.DISMISSED, null);

        assertThat(updated.getDismissedAt()).isNotNull();
    }

    @Test
    void updateStatus_invalidTransition_throwsBadRequest() {
        Alert alert = sampleAlert(AlertStatus.CLOSED);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));

        assertThatThrownBy(() -> alertService.updateStatus(1L, AlertStatus.ACKNOWLEDGED, null))
            .isInstanceOf(BadRequestException.class);
    }

    @Test
    void updateStatus_toOpen_alwaysRejected() {
        Alert alert = sampleAlert(AlertStatus.ACKNOWLEDGED);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));

        assertThatThrownBy(() -> alertService.updateStatus(1L, AlertStatus.OPEN, null))
            .isInstanceOf(BadRequestException.class);
    }

    @Test
    void getAlertHistory_includesOnlyPopulatedTimestampsInOrder() {
        Alert alert = sampleAlert(AlertStatus.CLOSED);
        Instant created = Instant.parse("2026-01-01T00:00:00Z");
        Instant acknowledged = Instant.parse("2026-01-01T01:00:00Z");
        Instant closed = Instant.parse("2026-01-01T02:00:00Z");
        alert.setCreatedAt(created);
        alert.setAcknowledgedAt(acknowledged);
        alert.setClosedAt(closed);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));

        List<AlertHistoryEntry> history = alertService.getAlertHistory(1L);

        assertThat(history).hasSize(3);
        assertThat(history.get(0).status()).isEqualTo(AlertStatus.OPEN);
        assertThat(history.get(1).status()).isEqualTo(AlertStatus.ACKNOWLEDGED);
        assertThat(history.get(2).status()).isEqualTo(AlertStatus.CLOSED);
    }

    @Test
    void addNote_savesAndReturnsResponse() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        ArgumentCaptor<AlertNote> captor = ArgumentCaptor.forClass(AlertNote.class);
        when(alertNoteRepository.save(captor.capture())).thenAnswer(invocation -> {
            AlertNote note = invocation.getArgument(0);
            note.setId(5L);
            note.setCreatedAt(Instant.now());
            return note;
        });

        AlertNoteResponse response = alertService.addNote(1L, "  looks suspicious  ");

        assertThat(response.id()).isEqualTo(5L);
        assertThat(captor.getValue().getNote()).isEqualTo("looks suspicious");
    }

    @Test
    void addNote_blankNote_throwsBadRequest() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));

        assertThatThrownBy(() -> alertService.addNote(1L, "   "))
            .isInstanceOf(BadRequestException.class);
        verify(alertNoteRepository, never()).save(any());
    }

    @Test
    void investigateAlert_withTransaction_buildsFindingsAndPersistsNote() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        MonitoredTransaction transaction = new MonitoredTransaction();
        transaction.setId(10L);
        transaction.setAccountId("ACC-1");
        transaction.setPayeeId("PAYEE-1");
        transaction.setAmount(new BigDecimal("9500.00"));
        transaction.setCurrency("USD");
        transaction.setCountry("US");

        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(transactionRepository.findById(10L)).thenReturn(Optional.of(transaction));
        when(alertNoteRepository.findByAlertIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertInvestigationResponse response = alertService.investigateAlert(1L, true);

        assertThat(response.riskLevel()).isEqualTo("HIGH");
        assertThat(response.keyFindings()).anySatisfy(f -> assertThat(f).contains("Destination country: US"));
        assertThat(alert.getLifecycleNote()).contains("Investigation generated for alert 1");
        verify(alertRepository).save(alert);
    }

    @Test
    void investigateAlert_withoutTransaction_addsUnavailableFinding() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(transactionRepository.findById(10L)).thenReturn(Optional.empty());
        when(alertNoteRepository.findByAlertIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        AlertInvestigationResponse response = alertService.investigateAlert(1L, false);

        assertThat(response.keyFindings()).anySatisfy(f -> assertThat(f).contains("not available"));
        assertThat(response.persistedToLifecycleNote()).isFalse();
        verify(alertRepository, never()).save(any());
    }

    @Test
    void investigateAlert_criticalSeverity_mapsToVeryHighRiskLevel() {
        Alert alert = sampleAlert(AlertStatus.OPEN);
        alert.setSeverity(Severity.CRITICAL);
        when(alertRepository.findById(1L)).thenReturn(Optional.of(alert));
        when(transactionRepository.findById(10L)).thenReturn(Optional.empty());
        when(alertNoteRepository.findByAlertIdOrderByCreatedAtAsc(1L)).thenReturn(List.of());

        AlertInvestigationResponse response = alertService.investigateAlert(1L, false);

        assertThat(response.riskLevel()).isEqualTo("VERY_HIGH");
    }
}
