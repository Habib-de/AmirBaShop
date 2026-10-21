package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.order.CreateOrderRequest;
import co.ke.amirbabyshop.dto.order.OrderDto;
import co.ke.amirbabyshop.dto.order.OrderSummaryDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    /* ═══════════════ CREATE (auth required, can be guest) ═══════════════ */

    @PostMapping
    public ApiResponse<OrderDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateOrderRequest req
    ) {
        String tenantId = principal != null && principal.getTenantId() != null
                ? principal.getTenantId()
                : defaultTenant;

        Long userId = principal != null ? principal.getId() : null;
        String userName = principal != null ? principal.getUsername() : "Guest";
        String userRole = principal != null ? principal.getRole() : "guest";

        return ApiResponse.ok("Order placed",
                orderService.create(tenantId, userId, userName, userRole, req));
    }

    /* ═══════════════ LIST (staff only — all orders of tenant) ═══════════════ */

    @GetMapping
    public ApiResponse<List<OrderSummaryDto>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String status
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        if (!"owner".equals(principal.getRole()) && !"sales".equals(principal.getRole())) {
            throw new UnauthorizedException("Only staff can view all orders");
        }
        return ApiResponse.ok(orderService.listForTenant(principal.getTenantId(), status));
    }

    /* ═══════════════ MY ORDERS (any authenticated user) ═══════════════ */

    @GetMapping("/mine")
    public ApiResponse<List<OrderSummaryDto>> mine(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(orderService.listForCustomer(principal.getUsername()));
    }

     /* ═══════════════ PENDING COUNT (staff only — for nav badge) ═══════════════ */

    @GetMapping("/pending-count")
    public ApiResponse<Long> pendingCount(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        if (!"owner".equals(principal.getRole()) && !"sales".equals(principal.getRole())) {
            return ApiResponse.ok(0L);
        }
        return ApiResponse.ok(orderService.countPending(principal.getTenantId()));
    }

        /* ═══════════════ PUBLIC TRACKING (guests can search) ═══════════════ */

    @GetMapping("/track")
    public ApiResponse<OrderDto> track(
            @RequestParam String query
    ) {
        return ApiResponse.ok(orderService.trackPublic(defaultTenant, query));
    }

    /* ═══════════════ GET ONE ═══════════════ */

    @GetMapping("/{id}")
    public ApiResponse<OrderDto> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(orderService.getById(
                principal.getTenantId(),
                principal.getRole(),
                principal.getUsername(),
                id
        ));
    }

    /* ═══════════════ STATE TRANSITIONS (staff only) ═══════════════ */

    @PatchMapping("/{id}/confirm")
    public ApiResponse<OrderDto> confirm(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Order confirmed",
                orderService.confirm(principal.getTenantId(), principal.getRole(), id));
    }

    @PatchMapping("/{id}/fulfill")
    public ApiResponse<OrderDto> fulfill(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Order fulfilled",
                orderService.fulfill(principal.getTenantId(), principal.getRole(), id));
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<OrderDto> cancel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Order cancelled",
                orderService.cancel(principal.getTenantId(), principal.getRole(), id));
    }

    /* ═══════════════ GENERIC UPDATE (staff only) ═══════════════ */
    /* Used by:
       - Edit Order modal (customer fields)
       - Confirm flow (attach carrier / tracking / eta)
    */

    @PatchMapping("/{id}")
    public ApiResponse<OrderDto> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, Object> patch
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Order updated",
                orderService.update(principal.getTenantId(), principal.getRole(), id, patch));
    }

    /* ═══════════════ UPDATE PAYMENT STATUS (staff only) ═══════════════ */

    @PatchMapping("/{id}/payment-status")
    public ApiResponse<OrderDto> updatePaymentStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Payment status updated",
                orderService.updatePaymentStatus(principal.getTenantId(), principal.getRole(), id, body.get("status")));
    }

    /* ═══════════════ DELETE (staff only) ═══════════════ */

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        orderService.delete(principal.getTenantId(), principal.getRole(), id);
        return ApiResponse.ok("Order deleted", null);
    }

    /* ═══════════════ ADD CHECKPOINT (staff only) ═══════════════ */
    /* Used by the "advance stage" button on tracking timeline */

    @PostMapping("/{id}/checkpoints")
    public ApiResponse<OrderDto> addCheckpoint(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, Object> checkpoint
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Checkpoint added",
                orderService.addCheckpoint(principal.getTenantId(), principal.getRole(), id, checkpoint));
    }
}