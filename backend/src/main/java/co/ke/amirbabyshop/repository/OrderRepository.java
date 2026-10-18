package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, String> {

    Page<Order> findByTenantIdOrderByCreatedAtDesc(String tenantId, Pageable pageable);

    Page<Order> findByTenantIdAndStatusOrderByCreatedAtDesc(
            String tenantId, String status, Pageable pageable);

    List<Order> findByCustomerEmailIgnoreCaseOrderByCreatedAtDesc(String email);

    Optional<Order> findByIdAndTenantId(String id, String tenantId);

    Optional<Order> findByTenantIdAndTrackingNumber(String tenantId, String trackingNumber);
}