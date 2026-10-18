package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.review.CreateReviewRequest;
import co.ke.amirbabyshop.dto.review.ReplyReviewRequest;
import co.ke.amirbabyshop.dto.review.ReviewDto;
import co.ke.amirbabyshop.dto.review.VoteReviewRequest;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    /* ═══════════════ PUBLIC — LIST ═══════════════ */

        @GetMapping
    public ApiResponse<List<ReviewDto>> listAll(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long productId
    ) {
        /* Specific product */
        if (productId != null) {
            boolean isStaff = principal != null
                    && ("owner".equals(principal.getRole()) || "sales".equals(principal.getRole()));
            return ApiResponse.ok(reviewService.listForProduct(productId, isStaff));
        }

        /* All reviews for a tenant — guests use default tenant, staff use own tenant */
        String tenantId = principal != null && principal.getTenantId() != null
                ? principal.getTenantId()
                : defaultTenant;

        boolean isStaff = principal != null
                && ("owner".equals(principal.getRole()) || "sales".equals(principal.getRole()));

        return ApiResponse.ok(reviewService.listForTenant(tenantId, isStaff));
    }

    /* ═══════════════ PUBLIC — PER PRODUCT ═══════════════ */

    @GetMapping("/product/{productId}")
    public ApiResponse<List<ReviewDto>> listForProduct(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId
    ) {
        boolean isStaff = principal != null
                && ("owner".equals(principal.getRole()) || "sales".equals(principal.getRole()));
        return ApiResponse.ok(reviewService.listForProduct(productId, isStaff));
    }

    /* ═══════════════ CREATE ═══════════════ */

    @PostMapping
    public ApiResponse<ReviewDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateReviewRequest req
    ) {
        if (principal != null) {
            req.setUserId(principal.getId());
            req.setAuthorEmail(principal.getUsername());
            req.setAuthorRole(principal.getRole());
            req.setAuthorName(principal.getName()); 
        }
        String tenant = principal != null && principal.getTenantId() != null
                ? principal.getTenantId()
                : defaultTenant;
        return ApiResponse.ok("Review submitted", reviewService.create(tenant, req));
    }

    /* ═══════════════ VOTE ═══════════════ */

    @PostMapping("/{id}/vote")
    public ApiResponse<ReviewDto> vote(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody VoteReviewRequest req
    ) {
        Long userId = principal != null ? principal.getId() : null;
        return ApiResponse.ok("Vote recorded",
                reviewService.vote(id, userId, req.getGuestToken(), req.getVote()));
    }

    /* ═══════════════ REPLY (staff) ═══════════════ */

    @PostMapping("/{id}/reply")
    public ApiResponse<ReviewDto> reply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody ReplyReviewRequest req
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        req.setAuthor(principal.getName()); 
        req.setRole(principal.getRole());
        return ApiResponse.ok("Reply added",
                reviewService.addReply(id, principal.getRole(), req));
    }

    /* ═══════════════ MODERATE (staff) ═══════════════ */

    @PatchMapping("/{id}/status")
    public ApiResponse<ReviewDto> setStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Status updated",
                reviewService.setStatus(id, principal.getRole(), body.get("status")));
    }

    /* ═══════════════ DELETE ═══════════════ */

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        reviewService.delete(id, principal.getId(), principal.getRole(), principal.getUsername());
        return ApiResponse.ok("Review deleted", null);
    }
}