package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.common.response.PagedResponse;
import co.ke.amirbabyshop.domain.Category;
import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.domain.ProductVariant;
import co.ke.amirbabyshop.dto.product.CreateProductRequest;
import co.ke.amirbabyshop.dto.product.ProductDto;
import co.ke.amirbabyshop.mapper.ProductMapper;
import co.ke.amirbabyshop.repository.CategoryRepository;
import co.ke.amirbabyshop.repository.ProductRepository;
import co.ke.amirbabyshop.repository.ProductVariantRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductMapper mapper;
    private final ObjectMapper objectMapper;
    private final StockAlertService stockAlertService;
    private final StockMovementService stockMovementService;

    /* ═══════════════ READ ═══════════════ */

    @Transactional(readOnly = true)
    public PagedResponse<ProductDto> list(String tenantId,
                                          Integer categoryId,
                                          String query,
                                          Pageable pageable) {
        Page<Product> page;
        if (query != null && !query.isBlank()) {
            page = productRepository.search(tenantId, query.trim(), pageable);
        } else if (categoryId != null) {
            page = productRepository.findByTenantIdAndCategoryIdAndIsActiveTrue(
                    tenantId, categoryId, pageable);
        } else {
            page = productRepository.findByTenantIdAndIsActiveTrue(tenantId, pageable);
        }
        return PagedResponse.from(page.map(mapper::toDto));
    }

    @Transactional(readOnly = true)
    public ProductDto getById(String tenantId, Long id) {
        return mapper.toDto(load(tenantId, id));
    }

    /* ═══════════════ CREATE ═══════════════ */

    @Transactional
    public ProductDto create(String tenantId, String role, String callerName,
                             CreateProductRequest req) {
        requireStaff(role);

        Category category = categoryRepository.findById(req.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        if (!category.getTenantId().equals(tenantId)) {
            throw new ForbiddenException("Category does not belong to your shop");
        }

        String sku = req.getSku();
        if (sku == null || sku.isBlank()) {
            String prefix = category.getSlug() == null
                    ? "PRD"
                    : category.getSlug().substring(0, Math.min(3, category.getSlug().length())).toUpperCase();
            sku = prefix + "-" + (System.currentTimeMillis() % 100000);
        }

        Product product = Product.builder()
                .tenantId(tenantId)
                .categoryId(req.getCategoryId())
                .sku(sku)
                .name(req.getName().trim())
                .description(req.getDescription())
                .price(req.getPrice())
                .originalPrice(req.getOriginalPrice())
                .imageUrl(req.getImageUrl())
                .badge(req.getBadge())
                .ratingAvg(BigDecimal.ZERO)
                .reviewCount(0)
                .totalStock(0)
                .sizes(toJson(req.getSizes()))
                .colors(toJson(req.getColors()))
                .isActive(true)
                .build();

        productRepository.save(product);

        /* ─── Build variants from request (or even split) ─── */
        List<ProductVariant> variants = buildVariantsFromRequest(
                product, req.getSizes(), req.getColors(),
                req.getVariants(), req.getTotalStock());

        if (!variants.isEmpty()) {
            variantRepository.saveAll(variants);
            int total = variants.stream().mapToInt(ProductVariant::getStock).sum();
            product.setTotalStock(total);
            productRepository.save(product);

            /* Audit: initial stock for each variant */
            for (ProductVariant v : variants) {
                if (v.getStock() > 0) {
                    stockMovementService.record(
                            tenantId, product.getId(), v.getId(),
                            0, v.getStock(), v.getStock(),
                            "initial", null,
                            "Initial stock at product creation",
                            null, callerName, role
                    );
                }
            }
        }

        return mapper.toDto(product);
    }

    /* ═══════════════ UPDATE ═══════════════ */

    @Transactional
    public ProductDto update(String tenantId, String role, Long id, Map<String, Object> patch) {
        requireStaff(role);
        Product product = load(tenantId, id);

        if (patch.containsKey("name")) {
            Object raw = patch.get("name");
            String name = raw == null ? "" : String.valueOf(raw).trim();
            if (name.length() < 2) {
                throw new ApiException("Name is too short", HttpStatus.UNPROCESSABLE_ENTITY);
            }
            product.setName(name);
        }
        if (patch.containsKey("description")) {
            product.setDescription(strOrNull(patch.get("description")));
        }
        if (patch.containsKey("price")) {
            try {
                product.setPrice(new BigDecimal(String.valueOf(patch.get("price"))));
            } catch (Exception e) {
                throw new ApiException("Invalid price", HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }
        if (patch.containsKey("originalPrice")) {
            Object val = patch.get("originalPrice");
            if (val == null || String.valueOf(val).isBlank()) {
                product.setOriginalPrice(null);
            } else {
                try {
                    product.setOriginalPrice(new BigDecimal(String.valueOf(val)));
                } catch (Exception e) {
                    throw new ApiException("Invalid original price", HttpStatus.UNPROCESSABLE_ENTITY);
                }
            }
        }
        if (patch.containsKey("imageUrl")) {
            product.setImageUrl(strOrNull(patch.get("imageUrl")));
        }
        if (patch.containsKey("badge")) {
            product.setBadge(strOrNull(patch.get("badge")));
        }
        if (patch.containsKey("isActive")) {
            product.setIsActive(Boolean.parseBoolean(String.valueOf(patch.get("isActive"))));
        }
        if (patch.containsKey("categoryId")) {
            try {
                Integer newCat = Integer.valueOf(String.valueOf(patch.get("categoryId")));
                Category cat = categoryRepository.findById(newCat)
                        .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
                if (!cat.getTenantId().equals(tenantId)) {
                    throw new ForbiddenException("Category does not belong to your shop");
                }
                product.setCategoryId(newCat);
            } catch (NumberFormatException e) {
                throw new ApiException("Invalid category", HttpStatus.UNPROCESSABLE_ENTITY);
            }
        }

        /* sizes / colours */
        if (patch.containsKey("sizes")) {
            product.setSizes(toJson(toStringList(patch.get("sizes"))));
        }
        if (patch.containsKey("colors")) {
            product.setColors(toJson(toStringList(patch.get("colors"))));
        }

        productRepository.save(product);
        return mapper.toDto(product);
    }

    /* ═══════════════ VARIANT STOCK ═══════════════ */

    /** Set one variant's stock to an exact number. */
    @Transactional
    public ProductDto setVariantStock(String tenantId, String role, String callerName, Long id,
                                      String size, String color, int stock) {
        requireStaff(role);
        Product product = load(tenantId, id);
        ProductVariant variant = findOrCreateVariant(product, size, color);

        int previousStock = variant.getStock();
        int safeStock = Math.max(0, stock);
        variant.setStock(safeStock);
        variantRepository.save(variant);

        recalcProductTotal(product);

        /* Audit */
        stockMovementService.record(
                tenantId, product.getId(), variant.getId(),
                safeStock - previousStock, previousStock, safeStock,
                "adjustment", null,
                "Manual set to " + safeStock,
                null, callerName, role
        );

        /* Restock notification: 0 → positive */
        if (previousStock == 0 && safeStock > 0) {
            try {
                stockAlertService.notifyRestock(tenantId, product.getId(), size, color, product.getName());
            } catch (Exception e) {
                log.warn("[ProductService] notifyRestock failed: {}", e.getMessage());
            }
        }

        return mapper.toDto(product);
    }

    /** Add (positive delta) or remove (negative delta) units from one variant. */
    @Transactional
    public ProductDto adjustVariantStock(String tenantId, String role, String callerName, Long id,
                                         String size, String color, int delta) {
        requireStaff(role);
        Product product = load(tenantId, id);
        ProductVariant variant = variantRepository
                .findByProductIdAndSizeAndColor(product.getId(), size, color)
                .orElseThrow(() -> new ApiException("Variant not found", HttpStatus.NOT_FOUND));

        int previousStock = variant.getStock();
        int next = previousStock + delta;
        if (next < 0) {
            throw new ApiException("Insufficient stock", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        variant.setStock(next);
        variantRepository.save(variant);
        recalcProductTotal(product);

        stockMovementService.record(
                tenantId, product.getId(), variant.getId(),
                delta, previousStock, next,
                delta > 0 ? "restock" : "adjustment", null,
                null, null, callerName, role
        );

        if (previousStock == 0 && next > 0) {
            try {
                stockAlertService.notifyRestock(tenantId, product.getId(), size, color, product.getName());
            } catch (Exception e) {
                log.warn("[ProductService] notifyRestock failed: {}", e.getMessage());
            }
        }

        return mapper.toDto(product);
    }

    /* ═══════════════ DELETE ═══════════════ */

    @Transactional
    public void delete(String tenantId, String role, Long id) {
        requireStaff(role);
        productRepository.delete(load(tenantId, id));
    }

    /* ═══════════════ HELPERS ═══════════════ */

    private Product load(String tenantId, Long id) {
        return productRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + id));
    }

    private void requireStaff(String role) {
        if (!"owner".equals(role) && !"sales".equals(role)) {
            throw new ForbiddenException("Only staff can manage products");
        }
    }

    /** Sum all variant stocks and update product.totalStock. */
    private void recalcProductTotal(Product product) {
        List<ProductVariant> variants = variantRepository
                .findByProductIdOrderBySizeAscColorAsc(product.getId());
        int total = variants.stream().mapToInt(v -> v.getStock() == null ? 0 : v.getStock()).sum();
        product.setTotalStock(total);
        productRepository.save(product);
    }

    /** Find a variant, or create a placeholder one (used by setVariantStock). */
    private ProductVariant findOrCreateVariant(Product product, String size, String color) {
        return variantRepository
                .findByProductIdAndSizeAndColor(product.getId(),
                        blankToNull(size), blankToNull(color))
                .orElseGet(() -> ProductVariant.builder()
                        .product(product)
                        .size(blankToNull(size))
                        .color(blankToNull(color))
                        .stock(0)
                        .weightGrams(0)
                        .lowStockThreshold(10)
                        .isActive(true)
                        .build());
    }

    /** Build variant rows from a create request. */
        private List<ProductVariant> buildVariantsFromRequest(
            Product product,
            List<String> sizes,
            List<String> colors,
            List<CreateProductRequest.VariantInput> requestedVariants,
            Integer fallbackTotalStock) {

                List<ProductVariant> result = new ArrayList<>();

        /* Case 1: explicit per-variant list supplied */
        if (requestedVariants != null && !requestedVariants.isEmpty()) {
            for (CreateProductRequest.VariantInput v : requestedVariants) {
                int stock = v.getStock() == null ? 0 : Math.max(0, v.getStock());
                result.add(ProductVariant.builder()
                        .product(product)
                        .size(blankToNull(v.getSize()))
                        .color(blankToNull(v.getColor()))
                        .stock(stock)
                        .imageUrl(blankToNull(v.getImageUrl()))
                        .weightGrams(0)
                        .lowStockThreshold(10)
                        .isActive(true)
                        .build());
            }
            return result;
        }

        /* Case 2: sizes/colors lists → even split */
        List<String> ss = (sizes == null || sizes.isEmpty()) ? List.of((String) null) : sizes;
        List<String> cs = (colors == null || colors.isEmpty()) ? List.of((String) null) : colors;
        int count = ss.size() * cs.size();
        int total = fallbackTotalStock == null ? 0 : Math.max(0, fallbackTotalStock);
        int base = count > 0 ? total / count : 0;
        int remainder = count > 0 ? total % count : 0;

        int i = 0;
        for (String s : ss) {
            for (String c : cs) {
                result.add(ProductVariant.builder()
                        .product(product)
                        .size(s)
                        .color(c)
                        .stock(base + (i < remainder ? 1 : 0))
                        .weightGrams(0)
                        .lowStockThreshold(10)
                        .isActive(true)
                        .build());
                i++;
            }
        }
        return result;
    }

    /** Reverse of variantKey — matches known sizes longest-first. */
    private SizeColor parseKey(Product product, String key, List<String> sizes, List<String> colors) {
        if (key == null || key.isBlank()) return new SizeColor(null, null);

        List<String> ss = sizes == null ? new ArrayList<>() : new ArrayList<>(sizes);
        ss.sort((a, b) -> Integer.compare(b.length(), a.length()));

        for (String size : ss) {
            if (size != null && key.startsWith(size + "-")) {
                String color = key.substring(size.length() + 1);
                return new SizeColor(size, blankToNull(color));
            }
        }

        if (key.startsWith("_-")) {
            return new SizeColor(null, blankToNull(key.substring(2)));
        }
        if (key.endsWith("-_")) {
            return new SizeColor(blankToNull(key.substring(0, key.length() - 2)), null);
        }
        if ("_-_".equals(key)) return new SizeColor(null, null);

        int idx = key.indexOf('-');
        if (idx == -1) return new SizeColor(blankToNull(key), null);
        return new SizeColor(
                blankToNull(key.substring(0, idx)),
                blankToNull(key.substring(idx + 1))
        );
    }

    /* ─── Type helpers ─── */
    private static int toInt(Object o, int fallback) {
        if (o == null) return fallback;
        if (o instanceof Number n) return n.intValue();
        try { return (int) Double.parseDouble(String.valueOf(o).trim()); }
        catch (NumberFormatException e) { throw new ApiException("Invalid stock value", HttpStatus.UNPROCESSABLE_ENTITY); }
    }

    private String strOrNull(Object o) { return o == null ? null : String.valueOf(o); }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private List<String> toStringList(Object o) {
        if (o == null) return null;
        if (!(o instanceof List<?> raw)) {
            throw new ApiException("Expected a list", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        List<String> out = new ArrayList<>();
        for (Object item : raw) {
            if (item == null) continue;
            String s = String.valueOf(item).trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    public static class SizeColor {
        public final String size;
        public final String color;
        public SizeColor(String size, String color) {
            this.size = size;
            this.color = color;
        }
    }
}