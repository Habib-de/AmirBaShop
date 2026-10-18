package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.user.UserDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserDto> me(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(userService.getById(principal.getId()));
    }

    @PatchMapping("/me")
    public ApiResponse<UserDto> updateMe(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> patch
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Profile updated", userService.updateProfile(principal.getId(), patch));
    }

    @PostMapping("/me/password")
    public ApiResponse<Void> changePassword(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        userService.changePassword(principal.getId(), body.get("currentPassword"), body.get("newPassword"));
        return ApiResponse.ok("Password changed", null);
    }

    /* ═══════════════ TEAM (owner only) ═══════════════ */

    @GetMapping
    public ApiResponse<List<UserDto>> listTeam(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(userService.listByTenant(principal.getTenantId()));
    }

    @PatchMapping("/{id}/approve")
    public ApiResponse<UserDto> approve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("User approved",
                userService.approveUser(principal.getId(), principal.getRole(), id));
    }

    @PatchMapping("/{id}/reject")
    public ApiResponse<UserDto> reject(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("User rejected",
                userService.rejectUser(principal.getId(), principal.getRole(), id));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> remove(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        userService.deleteTeamMember(principal.getId(), principal.getRole(), principal.getTenantId(), id);
        return ApiResponse.ok("User removed", null);
    }
}