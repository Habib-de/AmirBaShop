package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Category;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Integer> {

    List<Category> findByTenantIdAndIsActiveTrueOrderBySortOrderAsc(String tenantId);

    List<Category> findByTenantId(String tenantId);   // ← ADD

    Optional<Category> findByTenantIdAndSlug(String tenantId, String slug);
}