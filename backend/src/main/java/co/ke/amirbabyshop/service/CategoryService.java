package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.domain.Category;
import co.ke.amirbabyshop.dto.category.CategoryDto;
import co.ke.amirbabyshop.mapper.ProductMapper;
import co.ke.amirbabyshop.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductMapper mapper;

    /* Public — active only */
    @Transactional(readOnly = true)
    public List<CategoryDto> listActive(String tenantId) {
        return categoryRepository
                .findByTenantIdAndIsActiveTrueOrderBySortOrderAsc(tenantId)
                .stream()
                .map(mapper::toDto)
                .toList();
    }

    /* Staff — all */
    @Transactional(readOnly = true)
    public List<CategoryDto> listAll(String tenantId) {
        return categoryRepository.findByTenantId(tenantId).stream()
                .sorted((a, b) -> {
                    int sa = a.getSortOrder() == null ? 0 : a.getSortOrder();
                    int sb = b.getSortOrder() == null ? 0 : b.getSortOrder();
                    return Integer.compare(sa, sb);
                })
                .map(mapper::toDto)
                .toList();
    }

    /* Staff — create */
    @Transactional
    public CategoryDto create(String tenantId, String role, Map<String, Object> body) {
        requireStaff(role);

        String name = asString(body.get("name"));
        if (name == null || name.isBlank()) {
            throw new ApiException("Category name is required", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        String slug = (name.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", ""));

        if (categoryRepository.findByTenantIdAndSlug(tenantId, slug).isPresent()) {
            throw new ApiException("Category with this name already exists", HttpStatus.CONFLICT);
        }

        String icon = asString(body.get("icon"));
        Integer sortOrder = asInteger(body.get("sortOrder"));

        Category category = Category.builder()
                .tenantId(tenantId)
                .slug(slug)
                .name(name.trim())
                .icon(icon)
                .sortOrder(sortOrder != null ? sortOrder : 0)
                .isActive(true)
                .build();

        categoryRepository.save(category);
        return mapper.toDto(category);
    }

    /* Owner — delete */
    @Transactional
    public void delete(String tenantId, String role, Integer id) {
        if (!"owner".equals(role)) {
            throw new ForbiddenException("Only the shop owner can delete categories");
        }
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!cat.getTenantId().equals(tenantId)) {
            throw new ForbiddenException("Category does not belong to your shop");
        }
        categoryRepository.delete(cat);
    }

    /* ═══ Helpers ═══ */
    private void requireStaff(String role) {
        if (!"owner".equals(role) && !"sales".equals(role)) {
            throw new ForbiddenException("Only staff can manage categories");
        }
    }

    private static String asString(Object o) {
        return o == null ? null : o.toString();
    }

    private static Integer asInteger(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.intValue();
        try { return Integer.parseInt(o.toString()); }
        catch (Exception e) { return null; }
    }
}