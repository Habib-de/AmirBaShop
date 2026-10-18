package co.ke.amirbabyshop.controller;

import co.ke.amirbabyshop.common.exception.UnauthorizedException;
import co.ke.amirbabyshop.common.response.ApiResponse;
import co.ke.amirbabyshop.dto.category.CategoryDto;
import co.ke.amirbabyshop.security.UserPrincipal;
import co.ke.amirbabyshop.service.CategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @Value("${app.default-tenant}")
    private String defaultTenant;

    /* Public — active only */
    @GetMapping
    public ApiResponse<List<CategoryDto>> list() {
        return ApiResponse.ok(categoryService.listActive(defaultTenant));
    }

    /* Staff — all categories for this tenant */
    @GetMapping("/all")
    public ApiResponse<List<CategoryDto>> listAll(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok(categoryService.listAll(principal.getTenantId()));
    }

    /* Staff — create */
    @PostMapping
    public ApiResponse<CategoryDto> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, Object> body
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        return ApiResponse.ok("Category created",
                categoryService.create(principal.getTenantId(), principal.getRole(), body));
    }

    /* Owner — delete */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Integer id
    ) {
        if (principal == null) throw new UnauthorizedException("Not authenticated");
        categoryService.delete(principal.getTenantId(), principal.getRole(), id);
        return ApiResponse.ok("Category deleted", null);
    }
}