package co.ke.amirbabyshop.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Lightweight product shape for grids & lists.
 * Matches the frontend ProductCard's needs — no variants, no description.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductSummaryDto {
    private Long id;
    private Integer categoryId;
    private String sku;
    private String name;
    private String imageUrl;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String badge;
    private BigDecimal ratingAvg;
    private Integer reviewCount;
    private Integer totalStock;
}