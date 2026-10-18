package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.tenant.TenantDto;
import co.ke.amirbabyshop.dto.tenant.UpdateTenantRequest;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/tenant")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    /* ═══════════════ GET MY SHOP ═══════════════ */

    @GetMapping("/me")
    public ApiResponse<TenantDto> getMyTenant(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(tenantService.getMyTenant(principal.getTenantId()));
    }

    /* ═══════════════ UPDATE MY SHOP ═══════════════ */

    @PatchMapping("/me")
    public ApiResponse<TenantDto> updateMyTenant(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateTenantRequest request
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(
                "Shop updated",
                tenantService.updateMyTenant(principal.getTenantId(), principal.getRole(), request)
        );
    }
}