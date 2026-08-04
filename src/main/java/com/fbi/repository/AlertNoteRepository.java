package com.fbi.repository;
import com.fbi.model.AlertNote;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AlertNoteRepository extends JpaRepository<AlertNote, Long> {
    List<AlertNote> findByAlertIdOrderByCreatedAtAsc(Long alertId);
}
