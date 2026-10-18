package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.common.response.PagedResponse;
import co.ke.amirbabyshop.dto.product.CreateProductRequest;
import co.ke.amirbabyshop.dto.product.ProductDto;
import co.ke.amirbabyshop.dto.product.VariantAdjustRequest;
import co.ke.amirbabyshop.dto.product.VariantStockRequest;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.ProductService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    /* ═══════════════ PUBLIC READS ═══════════════ */

    @GetMapping
    public ApiResponse<PagedResponse<ProductDto>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer categoryId,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        String[] sortParts = sort.split(",");
        String sortField = sortParts[0];
        Sort.Direction direction = (sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc"))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        // Frontend asks for size=200 on the inventory page
        Pageable pageable = PageRequest.of(page, Math.min(size, 200), Sort.by(direction, sortField));

        String tenant = tenantOf(principal);
        return ApiResponse.ok(productService.list(tenant, categoryId, q, pageable));
    }

    @GetMapping("/{id}")
    public ApiResponse<ProductDto> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        return ApiResponse.ok(productService.getById(tenantOf(principal), id));
    }

    /* ═══════════════ STAFF WRITES ═══════════════ */

    @PostMapping
    public ApiResponse<ProductDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateProductRequest req
    ) {
        requireAuth(principal);
        return ApiResponse.ok("Product created",
                productService.create(principal.getTenantId(), principal.getRole(), req));
    }

    @PatchMapping("/{id}")
    public ApiResponse<ProductDto> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> patch
    ) {
        requireAuth(principal);
        return ApiResponse.ok("Product updated",
                productService.update(principal.getTenantId(), principal.getRole(), id, patch));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id
    ) {
        requireAuth(principal);
        productService.delete(principal.getTenantId(), principal.getRole(), id);
        return ApiResponse.ok("Product deleted", null);
    }

    /* ═══════════════ STOCK ═══════════════ */

    /** Single-number stock (products with no sizes/colours). */
    @PutMapping("/{id}/stock")
    public ApiResponse<ProductDto> setStock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, Object> body
    ) {
        requireAuth(principal);
        Map<String, Object> patch = new HashMap<>();
        patch.put("stock", body.get("stock"));
        return ApiResponse.ok("Stock updated",
                productService.update(principal.getTenantId(), principal.getRole(), id, patch));
    }

    /** Set one size/colour's stock to an exact number. */
    @PatchMapping("/{id}/variants")
    public ApiResponse<ProductDto> setVariantStock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody VariantStockRequest req
    ) {
        requireAuth(principal);
        return ApiResponse.ok("Variant stock updated",
                productService.setVariantStock(principal.getTenantId(), principal.getRole(), id,
                        req.getSize(), req.getColor(), req.getStock()));
    }

    /** Remove units from one size/colour. */
    @PostMapping("/{id}/variants/deduct")
    public ApiResponse<ProductDto> deductVariantStock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody VariantAdjustRequest req
    ) {
        requireAuth(principal);
        return ApiResponse.ok("Variant stock deducted",
                productService.adjustVariantStock(principal.getTenantId(), principal.getRole(), id,
                        req.getSize(), req.getColor(), -req.getQty()));
    }

    /** Add units back to one size/colour. */
    @PostMapping("/{id}/variants/restore")
    public ApiResponse<ProductDto> restoreVariantStock(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @Valid @RequestBody VariantAdjustRequest req
    ) {
        requireAuth(principal);
        return ApiResponse.ok("Variant stock restored",
                productService.adjustVariantStock(principal.getTenantId(), principal.getRole(), id,
                        req.getSize(), req.getColor(), req.getQty()));
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private String tenantOf(UserPrincipal principal) {
        return principal != null ? principal.getTenantId() : defaultTenant;
    }

    private void requireAuth(UserPrincipal principal) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
    }
}