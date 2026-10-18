package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.Coupon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {

    Optional<Coupon> findByTenantIdAndCodeIgnoreCase(String tenantId, String code);

    Page<Coupon> findByTenantId(String tenantId, Pageable pageable);

    List<Coupon> findByTenantIdAndIsActiveTrue(String tenantId);
}