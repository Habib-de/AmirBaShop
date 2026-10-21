package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.wishlist.WishlistItemDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ApiResponse<List<WishlistItemDto>> list(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(wishlistService.listMine(principal.getId()));
    }

    @PostMapping("/{productId}")
    public ApiResponse<Void> add(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        wishlistService.add(principal.getId(), productId);
        return ApiResponse.ok("Added to wishlist", null);
    }

    @DeleteMapping("/{productId}")
    public ApiResponse<Void> remove(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long productId
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        wishlistService.remove(principal.getId(), productId);
        return ApiResponse.ok("Removed from wishlist", null);
    }

    @DeleteMapping
    public ApiResponse<Void> clear(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        wishlistService.clear(principal.getId());
        return ApiResponse.ok("Wishlist cleared", null);
    }
}