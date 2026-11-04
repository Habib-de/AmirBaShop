package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.ProductVariant;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {

    /* ─── By product ─── */
    List<ProductVariant> findByProductIdOrderBySizeAscColorAsc(Long productId);

    /* ─── Lookup by size + color — handles NULLs correctly ─── */
    @Query("SELECT v FROM ProductVariant v " +
           "WHERE v.product.id = :productId " +
           "AND ((:size IS NULL AND v.size IS NULL) OR v.size = :size) " +
           "AND ((:color IS NULL AND v.color IS NULL) OR v.color = :color)")
    Optional<ProductVariant> findByProductIdAndSizeAndColor(
            @Param("productId") Long productId,
            @Param("size") String size,
            @Param("color") String color);

    /* ─── Race protection: lock the row for update ─── */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM ProductVariant v WHERE v.id = :id")
    Optional<ProductVariant> findByIdForUpdate(@Param("id") Long id);

    /* ─── By SKU or barcode ─── */
    Optional<ProductVariant> findBySku(String sku);
    Optional<ProductVariant> findByBarcode(String barcode);

    /* ─── Migration helper ─── */
    long countByProductId(Long productId);

    /* ─── Low stock ─── */
    List<ProductVariant> findByProductIdAndStockLessThanEqual(Long productId, Integer threshold);
}