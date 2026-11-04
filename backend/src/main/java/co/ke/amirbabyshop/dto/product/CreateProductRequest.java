package co.ke.amirbabyshop.dto.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateProductRequest {

    @NotNull
    private Integer categoryId;

    @NotBlank
    private String name;

    private String sku;

    private String description;

    @NotNull
    @PositiveOrZero
    private BigDecimal price;

    private BigDecimal originalPrice;

    private String imageUrl;

    private String badge;

    private List<String> sizes;

    private List<String> colors;

        /**
     * Optional — stock per size/colour, e.g.
     * [
     *   { "size": "0-3M", "color": "Pink", "stock": 5 },
     *   { "size": "3-6M", "color": "Blue", "stock": 8, "imageUrl": "..." }
     * ]
     * When present, totalStock is calculated from it.
     */
    private List<VariantInput> variants;

    @Data
    public static class VariantInput {
        private String size;
        private String color;
        private Integer stock;
        private String imageUrl;
    }

    /**
     * Only used when `variants` is omitted: stock is split evenly
     * across sizes × colours (or kept as a single number if there are none).
     */
    private Integer totalStock;
}