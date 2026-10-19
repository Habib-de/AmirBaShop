package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.returnrequest.CreateReturnRequest;
import co.ke.amirbabyshop.dto.returnrequest.ReturnDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.ReturnService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    @PostMapping
    public ApiResponse<ReturnDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateReturnRequest req
    ) {
        String tenantId = principal != null && principal.getTenantId() != null
                ? principal.getTenantId()
                : defaultTenant;

        if (principal != null) {
            req.setUserId(principal.getId());
            req.setCustomerEmail(principal.getUsername());
            req.setCustomerName(principal.getName());
        }

        return ApiResponse.ok("Return requested", returnService.create(tenantId, req));
    }

    @GetMapping
    public ApiResponse<List<ReturnDto>> listAll(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(returnService.listForTenant(principal.getTenantId(), principal.getRole()));
    }

    @GetMapping("/mine")
    public ApiResponse<List<ReturnDto>> listMine(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(returnService.listForCustomer(principal.getUsername()));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<ReturnDto> updateStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Status updated", returnService.updateStatus(
                principal.getTenantId(),
                principal.getRole(),
                id,
                body.get("status"),
                body.get("rejectionReason")
        ));
    }
}