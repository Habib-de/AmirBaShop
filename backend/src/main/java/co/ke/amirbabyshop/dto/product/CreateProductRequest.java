package co.ke.amirbabyshop.dto.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

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
     * {"0-3M-Pink": {"stock": 5}, "3-6M-Blue": {"stock": 8}}
     * Key format is "{size}-{colour}", with "_" for a missing size/colour.
     * When present, totalStock is calculated from it.
     */
    private Map<String, Map<String, Object>> variants;

    /**
     * Only used when `variants` is omitted: stock is split evenly
     * across sizes × colours (or kept as a single number if there are none).
     */
    private Integer totalStock;
}