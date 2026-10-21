package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Notification> findByUserEmailIgnoreCaseOrderByCreatedAtDesc(String email);
    long countByUserIdAndIsReadFalse(Long userId);
}