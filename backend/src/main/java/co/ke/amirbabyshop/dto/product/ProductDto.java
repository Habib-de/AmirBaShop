package co.ke.amirbabyshop.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Full product shape — used on the product detail page.
 * Includes parsed JSON fields (sizes, colors, variants).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDto {
    private Long id;
    private Integer categoryId;
    private String sku;
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String imageUrl;
    private String badge;
    private BigDecimal ratingAvg;
    private Integer reviewCount;
    private Integer totalStock;
    private List<String> sizes;
    private List<String> colors;
    private Map<String, Map<String, Object>> variants;
    private Boolean isActive;
}