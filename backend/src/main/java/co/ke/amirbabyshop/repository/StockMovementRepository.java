package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.StockMovement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /* ─── Full history for one product (paginated for the History modal) ─── */
    Page<StockMovement> findByProductIdOrderByCreatedAtDesc(Long productId, Pageable pageable);

    /* ─── History for one specific variant (0-3M Pink, etc.) ─── */
    List<StockMovement> findByVariantIdOrderByCreatedAtDesc(Long variantId);

    /* ─── By order (trace a specific sale) ─── */
    List<StockMovement> findByReference(String reference);

    /* ─── Date-range filter (used in reports, audits) ─── */
    Page<StockMovement> findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
            String tenantId, Instant from, Instant to, Pageable pageable);

    /* ─── Count movements for a product (sanity check during migration) ─── */
    long countByProductId(Long productId);
}