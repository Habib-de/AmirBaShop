package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.notification.NotificationDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ApiResponse<List<NotificationDto>> list(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(notificationService.listMine(principal.getId()));
    }

    @GetMapping("/unread-count")
    public ApiResponse<Long> unreadCount(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) return ApiResponse.ok(0L);
        return ApiResponse.ok(notificationService.unreadCount(principal.getId()));
    }

    @PatchMapping("/{id}/read")
    public ApiResponse<NotificationDto> markRead(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(notificationService.markRead(principal.getId(), id));
    }

    @PatchMapping("/read-all")
    public ApiResponse<Map<String, Object>> markAllRead(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        notificationService.markAllRead(principal.getId());
        return ApiResponse.ok(Map.of("ok", true));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        notificationService.delete(principal.getId(), id);
        return ApiResponse.ok("Deleted", null);
    }

    @DeleteMapping
    public ApiResponse<Void> clearAll(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        notificationService.clearAll(principal.getId());
        return ApiResponse.ok("Cleared", null);
    }
}