package co.ke.amirbabyshop.dto.product;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductVariantDto {
    private Long id;
    private String size;
    private String color;
    private String sku;
    private String barcode;
    private Integer weightGrams;
    private Integer stock;
    private BigDecimal priceOverride;
    private Integer lowStockThreshold;
    private String imageUrl;
    private Boolean isActive;
    private String label;
}