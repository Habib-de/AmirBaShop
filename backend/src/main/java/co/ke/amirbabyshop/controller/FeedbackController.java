package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.feedback.CreateFeedbackRequest;
import co.ke.amirbabyshop.dto.feedback.FeedbackDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    @PostMapping
    public ApiResponse<FeedbackDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateFeedbackRequest req
    ) {
        String tenantId = principal != null && principal.getTenantId() != null
                ? principal.getTenantId()
                : defaultTenant;

        if (principal != null) {
            req.setUserId(principal.getId());
            req.setSentBy(principal.getRole());
        }

        return ApiResponse.ok("Message sent", feedbackService.create(tenantId, req));
    }

    @GetMapping
    public ApiResponse<List<FeedbackDto>> listAll(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(feedbackService.listForTenant(principal.getTenantId(), principal.getRole()));
    }

    @GetMapping("/mine")
    public ApiResponse<List<FeedbackDto>> listMine(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam String email
    ) {
        return ApiResponse.ok(feedbackService.listForCustomer(email));
    }

    @PatchMapping("/{id}/status")
    public ApiResponse<FeedbackDto> updateStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Status updated", feedbackService.updateStatus(
                principal.getTenantId(), principal.getRole(), id, body.get("status")));
    }

    @PostMapping("/{id}/reply")
    public ApiResponse<FeedbackDto> addReply(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Reply added", feedbackService.addReply(
                principal.getTenantId(), principal.getRole(), id, body));
    }
}