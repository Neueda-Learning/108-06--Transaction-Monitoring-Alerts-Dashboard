package com.fbi.repository;

import com.fbi.model.MonitoredTransaction;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MonitoredTransactionRepository extends JpaRepository<MonitoredTransaction, Long>, JpaSpecificationExecutor<MonitoredTransaction> {

    long countByAccountIdAndOccurredAtAfter(String accountId, Instant occurredAt);

    List<MonitoredTransaction> findTop10ByAccountIdOrderByOccurredAtDesc(String accountId);

    boolean existsByAccountIdAndPayeeIdAndOccurredAtBeforeAndIdNot(String accountId, String payeeId, Instant occurredAt, Long id);

    @Query("select coalesce(sum(t.amount), 0) from MonitoredTransaction t where t.accountId = :accountId and t.occurredAt >= :start and t.occurredAt < :end")
    BigDecimal sumAmountForAccountBetween(@Param("accountId") String accountId, @Param("start") Instant start, @Param("end") Instant end);
}

