package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    List<Review> findByProductIdAndStatusOrderByCreatedAtDesc(Long productId, String status);

    List<Review> findByProductIdOrderByCreatedAtDesc(Long productId);

    List<Review> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    boolean existsByProductIdAndAuthorEmailIgnoreCase(Long productId, String email);

    /* For rating aggregation on the product */
    @Query("""
        SELECT COUNT(r), COALESCE(AVG(r.rating), 0)
        FROM Review r
        WHERE r.productId = :productId
          AND r.status = 'published'
    """)
    Object[] getStatsForProduct(@Param("productId") Long productId);
}