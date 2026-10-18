package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.registry.AddRegistryItemRequest;
import co.ke.amirbabyshop.dto.registry.CreateRegistryRequest;
import co.ke.amirbabyshop.dto.registry.GiftRegistryItemRequest;
import co.ke.amirbabyshop.dto.registry.RegistryDto;
import co.ke.amirbabyshop.dto.registry.UpdateRegistryRequest;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.RegistryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/registries")
@RequiredArgsConstructor
public class RegistryController {

    private final RegistryService registryService;

    /* ═══════════════ MY REGISTRY (auth) ═══════════════ */

    @GetMapping("/mine")
    public ApiResponse<RegistryDto> getMine(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(registryService.getMine(principal.getUsername()));
    }

    /* ═══════════════ PUBLIC VIEW (by slug) ═══════════════ */

    @GetMapping("/slug/{slug}")
    public ApiResponse<RegistryDto> getBySlug(@PathVariable String slug) {
        return ApiResponse.ok(registryService.getBySlug(slug));
    }

    /* ═══════════════ CREATE ═══════════════ */

    @PostMapping
    public ApiResponse<RegistryDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateRegistryRequest req
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");

        req.setOwnerUserId(principal.getId());
        req.setOwnerEmail(principal.getUsername());
        req.setOwnerName(principal.getName());

        return ApiResponse.ok("Registry created", registryService.create(req));
    }

    /* ═══════════════ UPDATE ═══════════════ */

    @PatchMapping("/{id}")
    public ApiResponse<RegistryDto> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody UpdateRegistryRequest req
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Registry updated",
                registryService.update(id, principal.getUsername(), req));
    }

    /* ═══════════════ DELETE ═══════════════ */

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        registryService.delete(id, principal.getUsername());
        return ApiResponse.ok("Registry deleted", null);
    }

    /* ═══════════════ ITEMS ═══════════════ */

    @PostMapping("/{id}/items")
    public ApiResponse<RegistryDto> addItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @Valid @RequestBody AddRegistryItemRequest req
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Item added",
                registryService.addItem(id, principal.getUsername(), req));
    }

    @DeleteMapping("/{id}/items/{itemId}")
    public ApiResponse<RegistryDto> removeItem(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @PathVariable String itemId
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Item removed",
                registryService.removeItem(id, principal.getUsername(), itemId));
    }

    @PatchMapping("/{id}/items/{itemId}/priority")
    public ApiResponse<RegistryDto> updatePriority(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @PathVariable String itemId,
            @RequestBody Map<String, String> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Priority updated",
                registryService.updateItemPriority(id, principal.getUsername(), itemId, body.get("priority")));
    }

    /* ═══════════════ GIFTS (public — guest can gift) ═══════════════ */

    @PostMapping("/{id}/items/{itemId}/gift")
    public ApiResponse<RegistryDto> markGifted(
            @PathVariable String id,
            @PathVariable String itemId,
            @Valid @RequestBody GiftRegistryItemRequest req
    ) {
        return ApiResponse.ok("Gift registered", registryService.markGifted(id, itemId, req));
    }

    @DeleteMapping("/{id}/gifts/{giftId}")
    public ApiResponse<RegistryDto> unmarkGifted(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @PathVariable String giftId
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Gift undone",
                registryService.unmarkGifted(id, principal.getUsername(), giftId));
    }

    @PatchMapping("/{id}/gifts/{giftId}/thanked")
    public ApiResponse<RegistryDto> markThanked(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String id,
            @PathVariable String giftId,
            @RequestBody Map<String, Boolean> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        boolean thanked = Boolean.TRUE.equals(body.get("thanked"));
        return ApiResponse.ok("Thanks status updated",
                registryService.markThanked(id, principal.getUsername(), giftId, thanked));
    }
}