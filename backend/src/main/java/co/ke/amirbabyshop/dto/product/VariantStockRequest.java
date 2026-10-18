package co.ke.amirbabyshop.dto.product;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

/** Body for PATCH /products/{id}/variants — sets one variant's stock. */
@Data
public class VariantStockRequest {

    /** null / blank = product has no sizes */
    private String size;

    /** null / blank = product has no colours */
    private String color;

    @NotNull
    @PositiveOrZero
    private Integer stock;
}