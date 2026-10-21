package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FeedbackRepository extends JpaRepository<Feedback, String> {
    List<Feedback> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<Feedback> findByEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}