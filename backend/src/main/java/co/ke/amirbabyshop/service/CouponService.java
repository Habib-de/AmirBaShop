package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Coupon;
import co.ke.amirbabyshop.dto.coupon.CouponDto;
import co.ke.amirbabyshop.dto.coupon.ValidateCouponRequest;
import co.ke.amirbabyshop.dto.coupon.ValidateCouponResponse;
import co.ke.amirbabyshop.repository.CouponRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CouponService {

    private static final Set<String> VALID_TYPES = Set.of("percent", "fixed", "freeship");

    private final CouponRepository couponRepository;

    /* ═══════════════ VALIDATION (public) ═══════════════ */

    @Transactional(readOnly = true)
    public ValidateCouponResponse validate(String tenantId, ValidateCouponRequest req) {
        String cleanCode = req.getCode() == null ? "" : req.getCode().trim().toUpperCase();
        if (cleanCode.isEmpty()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .message("Enter a code")
                    .build();
        }

        Coupon coupon = couponRepository.findByTenantIdAndCodeIgnoreCase(tenantId, cleanCode)
                .orElse(null);

        if (coupon == null) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("Invalid code")
                    .build();
        }

        if (Boolean.FALSE.equals(coupon.getIsActive())) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This coupon is no longer active")
                    .build();
        }

        if (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(Instant.now())) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This coupon has expired")
                    .build();
        }

        if (coupon.getMaxUses() != null && coupon.getMaxUses() > 0
                && coupon.getUses() != null && coupon.getUses() >= coupon.getMaxUses()) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("This coupon has reached its usage limit")
                    .build();
        }

        BigDecimal subtotal = req.getSubtotal() == null ? BigDecimal.ZERO : req.getSubtotal();
        BigDecimal minOrder = coupon.getMinOrder() == null ? BigDecimal.ZERO : coupon.getMinOrder();
        if (subtotal.compareTo(minOrder) < 0) {
            return ValidateCouponResponse.builder()
                    .valid(false)
                    .code(cleanCode)
                    .message("Minimum order of KES " + minOrder.toPlainString() + " required")
                    .build();
        }

        BigDecimal discount = computeDiscount(coupon, subtotal);

        return ValidateCouponResponse.builder()
                .valid(true)
                .code(coupon.getCode())
                .type(coupon.getType())
                .discount(discount)
                .message("Coupon applied")
                .build();
    }

    /* ═══════════════ CRUD (owner only) ═══════════════ */

@Transactional(readOnly = true)
public List<CouponDto> list(String tenantId, String role) {
    requireOwner(role);
    return couponRepository.findByTenantId(tenantId, Pageable.unpaged())
            .getContent().stream()
            .map(this::toDto)
            .toList();
}

    @Transactional
    public CouponDto create(String tenantId, String role, Map<String, Object> body) {
        requireOwner(role);

        String code = asString(body.get("code"));
        if (code == null || code.isBlank()) {
            throw new ApiException("Code is required", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        code = code.trim().toUpperCase();

        if (couponRepository.findByTenantIdAndCodeIgnoreCase(tenantId, code).isPresent()) {
            throw new ApiException("A coupon with this code already exists", HttpStatus.CONFLICT);
        }

        String type = asString(body.get("type"));
        if (type == null || !VALID_TYPES.contains(type)) {
            throw new ApiException("Invalid coupon type", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        BigDecimal value = asBigDecimal(body.get("value"));
        if ("percent".equals(type)
                && (value == null || value.compareTo(BigDecimal.ZERO) <= 0
                    || value.compareTo(BigDecimal.valueOf(100)) > 0)) {
            throw new ApiException("Percent must be 1-100", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if ("fixed".equals(type) && (value == null || value.compareTo(BigDecimal.ZERO) <= 0)) {
            throw new ApiException("Amount must be greater than 0", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        if ("freeship".equals(type)) {
            value = BigDecimal.ZERO;
        }

        Coupon coupon = Coupon.builder()
                .tenantId(tenantId)
                .code(code)
                .type(type)
                .value(value)
                .minOrder(asBigDecimal(body.get("minOrder")))
                .maxUses(asInteger(body.get("maxUses")))
                .expiresAt(asInstant(body.get("expiresAt")))
                .isActive(true)
                .build();

        couponRepository.save(coupon);
        return toDto(coupon);
    }

    @Transactional
    public CouponDto update(String tenantId, String role, Long id, Map<String, Object> body) {
        requireOwner(role);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));

        if (!coupon.getTenantId().equals(tenantId)) {
            throw new ForbiddenException("Coupon does not belong to your shop");
        }

        if (body.containsKey("type")) {
            String type = asString(body.get("type"));
            if (type == null || !VALID_TYPES.contains(type)) {
                throw new ApiException("Invalid coupon type", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            coupon.setType(type);
        }
        if (body.containsKey("value")) {
            coupon.setValue(asBigDecimal(body.get("value")));
        }
        if (body.containsKey("minOrder")) {
            coupon.setMinOrder(asBigDecimal(body.get("minOrder")));
        }
        if (body.containsKey("maxUses")) {
            coupon.setMaxUses(asInteger(body.get("maxUses")));
        }
        if (body.containsKey("expiresAt")) {
            coupon.setExpiresAt(asInstant(body.get("expiresAt")));
        }
        if (body.containsKey("isActive")) {
            Object active = body.get("isActive");
            coupon.setIsActive(active instanceof Boolean b ? b : Boolean.parseBoolean(String.valueOf(active)));
        }

        couponRepository.save(coupon);
        return toDto(coupon);
    }

    @Transactional
    public void delete(String tenantId, String role, Long id) {
        requireOwner(role);
        Coupon coupon = couponRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Coupon not found"));

        if (!coupon.getTenantId().equals(tenantId)) {
            throw new ForbiddenException("Coupon does not belong to your shop");
        }
        couponRepository.delete(coupon);
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private void requireOwner(String role) {
        if (!"owner".equals(role)) {
            throw new ForbiddenException("Only the shop owner can manage coupons");
        }
    }

    private BigDecimal computeDiscount(Coupon coupon, BigDecimal subtotal) {
        return switch (coupon.getType()) {
            case "percent" -> subtotal
                    .multiply(coupon.getValue())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            case "fixed" -> coupon.getValue().min(subtotal);
            case "freeship" -> BigDecimal.ZERO;
            default -> BigDecimal.ZERO;
        };
    }

    private CouponDto toDto(Coupon c) {
        return CouponDto.builder()
                .id(c.getId())
                .code(c.getCode())
                .type(c.getType())
                .value(c.getValue())
                .minOrder(c.getMinOrder())
                .maxUses(c.getMaxUses())
                .uses(c.getUses())
                .expiresAt(c.getExpiresAt())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .build();
    }

    /* ─── Type coercion helpers (body is Map<String,Object>) ─── */
    private static String asString(Object o) { return o == null ? null : o.toString(); }

    private static BigDecimal asBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(o.toString().trim()); }
        catch (Exception e) { return null; }
    }

    private static Integer asInteger(Object o) {
        if (o == null) return null;
        if (o instanceof Integer i) return i;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString().trim()); }
        catch (Exception e) { return null; }
    }

    private static Instant asInstant(Object o) {
        if (o == null) return null;
        try { return Instant.parse(o.toString()); }
        catch (Exception e) { return null; }
    }
}