package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.coupon.CouponDto;
import co.ke.amirbabyshop.dto.coupon.ValidateCouponRequest;
import co.ke.amirbabyshop.dto.coupon.ValidateCouponResponse;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.CouponService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService couponService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    /* ═══════════════ VALIDATE (public) ═══════════════ */
    /* Used by the frontend checkout page */

    @PostMapping("/validate")
public ApiResponse<ValidateCouponResponse> validate(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ValidateCouponRequest req) {

    // Priority: explicit body tenantId → authenticated user's tenant → default
    String tenant = req.getTenantId();
    if (tenant == null || tenant.isBlank()) {
        tenant = (principal != null && principal.getTenantId() != null)
                ? principal.getTenantId()
                : defaultTenant;
    }
    return ApiResponse.ok(couponService.validate(tenant, req));
}

    /* ═══════════════ CRUD (owner only) ═══════════════ */

    @GetMapping
    public ApiResponse<List<CouponDto>> list(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(couponService.list(principal.getTenantId(), principal.getRole()));
    }

    @PostMapping
    public ApiResponse<CouponDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> body) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Coupon created",
                couponService.create(principal.getTenantId(), principal.getRole(), body));
    }

    @PatchMapping("/{id}")
    public ApiResponse<CouponDto> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Coupon updated",
                couponService.update(principal.getTenantId(), principal.getRole(), id, body));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        couponService.delete(principal.getTenantId(), principal.getRole(), id);
        return ApiResponse.ok("Coupon deleted", null);
    }
}