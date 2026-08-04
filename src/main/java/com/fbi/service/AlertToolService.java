package com.fbi.service;

import com.fbi.model.MonitoredTransaction;
import com.fbi.repository.MonitoredTransactionRepository;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Wraps existing domain services/repositories as read-only "tools" the AI investigation
 * agent can pull context from. Each method here mirrors a piece of information a human
 * analyst would look up manually before making a decision on an alert.
 */
@Service
public class AlertToolService {

    private final MonitoredTransactionRepository transactionRepository;
    private final SdnScreeningService sdnScreeningService;

    public AlertToolService(
        MonitoredTransactionRepository transactionRepository,
        SdnScreeningService sdnScreeningService
    ) {
        this.transactionRepository = transactionRepository;
        this.sdnScreeningService = sdnScreeningService;
    }

    /**
     * Tool: returns the most recent transactions for an account, most recent first.
     */
    public List<MonitoredTransaction> getRecentTransactionHistory(String accountId) {
        return transactionRepository.findTop10ByAccountIdOrderByOccurredAtDesc(accountId);
    }

    /**
     * Tool: screens a payee name against the SDN sanctions list.
     * Returns null when there is no match above the default threshold.
     */
    public SdnScreeningService.SdnMatchResult checkSdnStatus(String payeeName) {
        return sdnScreeningService.screen(payeeName);
    }
}
