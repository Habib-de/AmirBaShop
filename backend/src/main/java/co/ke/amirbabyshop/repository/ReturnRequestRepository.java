package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.ReturnRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, String> {
    List<ReturnRequest> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    List<ReturnRequest> findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(String email);
}