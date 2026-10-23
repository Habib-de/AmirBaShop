package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.common.exception.ForbiddenException;
import co.ke.amirbabyshop.common.exception.ResourceNotFoundException;
import co.ke.amirbabyshop.common.response.PagedResponse;
import co.ke.amirbabyshop.domain.Category;
import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.dto.product.CreateProductRequest;
import co.ke.amirbabyshop.dto.product.ProductDto;
import co.ke.amirbabyshop.mapper.ProductMapper;
import co.ke.amirbabyshop.repository.CategoryRepository;
import co.ke.amirbabyshop.repository.ProductRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ProductService {

    /** Variant key used for products that have no sizes and no colours. */
    private static final String NO_VARIANT_KEY = "_-_";

    private static final TypeReference<Map<String, Map<String, Object>>> VARIANTS_TYPE =
            new TypeReference<Map<String, Map<String, Object>>>() {};

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper mapper;
    private final ObjectMapper objectMapper;
    private final StockAlertService stockAlertService;

    /* ═══════════════ READ ═══════════════ */

    /**
     * Returns the FULL ProductDto (sizes, colors, variants) for every product,
     * so the inventory and shop pages can show stock per size/colour.
     */
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
        return PagedResponse.from(page.map(p -> mapper.toDto(p)));
    }

    @Transactional(readOnly = true)
    public ProductDto getById(String tenantId, Long id) {
        return mapper.toDto(load(tenantId, id));
    }

    /* ═══════════════ CREATE ═══════════════ */

    @Transactional
    public ProductDto create(String tenantId, String role, CreateProductRequest req) {
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

        // Per-variant stock from the form, or fall back to an even split
        Map<String, Map<String, Object>> variants = sanitizeVariants(req.getVariants());
        if (variants.isEmpty()) {
            int requested = req.getTotalStock() == null ? 0 : Math.max(0, req.getTotalStock());
            variants = buildEvenVariants(req.getSizes(), req.getColors(), requested);
        }
        int totalStock = sumStock(variants);

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
                .totalStock(totalStock)
                .sizes(toJson(req.getSizes()))
                .colors(toJson(req.getColors()))
                .variants(toJson(variants))
                .isActive(true)
                .build();

        productRepository.save(product);
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

        /* ── sizes / colours ── */
        if (patch.containsKey("sizes")) {
            product.setSizes(toJson(toStringList(patch.get("sizes"))));
        }
        if (patch.containsKey("colors")) {
            product.setColors(toJson(toStringList(patch.get("colors"))));
        }

        /* ── stock: per-variant map wins; otherwise plain number ── */
        boolean variantsHandled = false;

        if (patch.containsKey("variants")) {
            Map<String, Map<String, Object>> variants =
                    sanitizeVariants(castVariants(patch.get("variants")));

            if (variants.isEmpty()) {
                // No sizes/colours → single stock number stored under "_-_"
                int single = patch.containsKey("totalStock")
                        ? toInt(patch.get("totalStock"))
                        : (patch.containsKey("stock") ? toInt(patch.get("stock")) : product.getTotalStock());
                variants = singleVariant(Math.max(0, single));
            }
            product.setVariants(toJson(variants));
            product.setTotalStock(sumStock(variants));
            variantsHandled = true;
        }

        if (!variantsHandled && (patch.containsKey("totalStock") || patch.containsKey("stock"))) {
            Map<String, Map<String, Object>> current = readVariants(product);
            boolean isSingle = current.isEmpty()
                    || (current.size() == 1 && current.containsKey(NO_VARIANT_KEY));
            if (!isSingle) {
                throw new ApiException(
                        "This product has sizes/colours — update stock per variant",
                        HttpStatus.UNPROCESSABLE_ENTITY);
            }
            Object raw = patch.containsKey("totalStock") ? patch.get("totalStock") : patch.get("stock");
            Map<String, Map<String, Object>> variants = singleVariant(Math.max(0, toInt(raw)));
            product.setVariants(toJson(variants));
            product.setTotalStock(sumStock(variants));
        }

        productRepository.save(product);
        return mapper.toDto(product);
    }

    /* ═══════════════ VARIANT STOCK ═══════════════ */

        /** Set one variant's stock to an exact number. */
    @Transactional
    public ProductDto setVariantStock(String tenantId, String role, Long id,
                                      String size, String color, int stock) {
        requireStaff(role);
        Product product = load(tenantId, id);

        Map<String, Map<String, Object>> variants = readVariants(product);
        String key = variantKey(size, color);

        int previousStock = toInt(
                variants.getOrDefault(key, new LinkedHashMap<>()).get("stock"));

        Map<String, Object> entry = new LinkedHashMap<>(variants.getOrDefault(key, new LinkedHashMap<>()));
        entry.put("stock", Math.max(0, stock));
        variants.put(key, entry);

        ProductDto dto = saveVariants(product, variants);

        // 0 → positive = restock: notify subscribers
        if (previousStock == 0 && stock > 0) {
            try {
                stockAlertService.notifyRestock(tenantId, id, size, color, product.getName());
            } catch (Exception e) {
                // Non-fatal — never fail a stock update because of notification errors
                System.err.println("[ProductService] notifyRestock failed: " + e.getMessage());
            }
        }

        return dto;
    }

        /** Add (positive delta) or remove (negative delta) units from one variant. */
    @Transactional
    public ProductDto adjustVariantStock(String tenantId, String role, Long id,
                                         String size, String color, int delta) {
        requireStaff(role);
        Product product = load(tenantId, id);

        Map<String, Map<String, Object>> variants = readVariants(product);
        String key = variantKey(size, color);

        Map<String, Object> existing = variants.get(key);
        if (existing == null) {
            throw new ApiException("Variant not found: " + key, HttpStatus.NOT_FOUND);
        }

        int previousStock = toInt(existing.get("stock"));
        int next = previousStock + delta;
        if (next < 0) {
            throw new ApiException("Insufficient stock for " + key, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Map<String, Object> entry = new LinkedHashMap<>(existing);
        entry.put("stock", next);
        variants.put(key, entry);

        ProductDto dto = saveVariants(product, variants);

        // 0 → positive = restock: notify subscribers
        if (previousStock == 0 && next > 0) {
            try {
                stockAlertService.notifyRestock(tenantId, id, size, color, product.getName());
            } catch (Exception e) {
                System.err.println("[ProductService] notifyRestock failed: " + e.getMessage());
            }
        }

        return dto;
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

    /** Same format the frontend uses: "{size}-{color}" with "_" for blanks. */
    private String variantKey(String size, String color) {
        String s = (size == null || size.isBlank()) ? "_" : size.trim();
        String c = (color == null || color.isBlank()) ? "_" : color.trim();
        return s + "-" + c;
    }

    private ProductDto saveVariants(Product product, Map<String, Map<String, Object>> variants) {
        product.setVariants(toJson(variants));
        product.setTotalStock(sumStock(variants));
        productRepository.save(product);
        return mapper.toDto(product);
    }

    private Map<String, Map<String, Object>> readVariants(Product product) {
        String json = product.getVariants();
        if (json == null || json.isBlank()) return new LinkedHashMap<>();
        try {
            Map<String, Map<String, Object>> parsed = objectMapper.readValue(json, VARIANTS_TYPE);
            return parsed == null ? new LinkedHashMap<>() : new LinkedHashMap<>(parsed);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private Map<String, Map<String, Object>> castVariants(Object raw) {
        if (raw == null) return new LinkedHashMap<>();
        try {
            return objectMapper.convertValue(raw, VARIANTS_TYPE);
        } catch (IllegalArgumentException e) {
            throw new ApiException("Invalid variants", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    /** Trims keys, forces stock to an int >= 0, drops blank keys. */
    private Map<String, Map<String, Object>> sanitizeVariants(Map<String, Map<String, Object>> in) {
        Map<String, Map<String, Object>> out = new LinkedHashMap<>();
        if (in == null) return out;
        for (Map.Entry<String, Map<String, Object>> e : in.entrySet()) {
            if (e.getKey() == null || e.getKey().isBlank()) continue;
            Map<String, Object> copy = new LinkedHashMap<>();
            if (e.getValue() != null) copy.putAll(e.getValue());
            copy.put("stock", Math.max(0, toInt(copy.get("stock"))));
            out.put(e.getKey().trim(), copy);
        }
        return out;
    }

    private int sumStock(Map<String, Map<String, Object>> variants) {
        int total = 0;
        for (Map<String, Object> v : variants.values()) {
            total += Math.max(0, toInt(v.get("stock")));
        }
        return total;
    }

    private Map<String, Map<String, Object>> singleVariant(int stock) {
        Map<String, Map<String, Object>> m = new LinkedHashMap<>();
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("stock", stock);
        m.put(NO_VARIANT_KEY, v);
        return m;
    }

    /** Even split across sizes × colours; any remainder goes to the first variants. */
    private Map<String, Map<String, Object>> buildEvenVariants(List<String> sizes,
                                                               List<String> colors,
                                                               int totalStock) {
        List<String> ss = (sizes == null || sizes.isEmpty()) ? List.of("_") : sizes;
        List<String> cs = (colors == null || colors.isEmpty()) ? List.of("_") : colors;
        int count = ss.size() * cs.size();
        int base = count > 0 ? totalStock / count : 0;
        int remainder = count > 0 ? totalStock % count : 0;

        Map<String, Map<String, Object>> variants = new LinkedHashMap<>();
        int i = 0;
        for (String s : ss) {
            for (String c : cs) {
                Map<String, Object> v = new LinkedHashMap<>();
                v.put("stock", base + (i < remainder ? 1 : 0));
                variants.put(s + "-" + c, v);
                i++;
            }
        }
        return variants;
    }

    private int toInt(Object o) {
        if (o == null) return 0;
        if (o instanceof Number n) return n.intValue();
        try {
            return (int) Double.parseDouble(String.valueOf(o).trim());
        } catch (NumberFormatException e) {
            throw new ApiException("Invalid stock value", HttpStatus.UNPROCESSABLE_ENTITY);
        }
    }

    private String strOrNull(Object o) {
        return o == null ? null : String.valueOf(o);
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
}