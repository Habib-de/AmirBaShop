package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {

    Page<Product> findByTenantIdAndIsActiveTrue(String tenantId, Pageable pageable);

    Page<Product> findByTenantIdAndCategoryIdAndIsActiveTrue(
            String tenantId, Integer categoryId, Pageable pageable);

    Optional<Product> findByIdAndTenantId(Long id, String tenantId);

    @Query("""
        SELECT p FROM Product p
        WHERE p.tenantId = :tenantId
          AND p.isActive = true
          AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(p.description) LIKE LOWER(CONCAT('%', :q, '%')))
    """)
    Page<Product> search(@Param("tenantId") String tenantId,
                         @Param("q") String query,
                         Pageable pageable);
}