package co.ke.amirbabyshop.dto.product;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

/** Body for POST /products/{id}/variants/deduct and /variants/restore. */
@Data
public class VariantAdjustRequest {

    private String size;

    private String color;

    @NotNull
    @Positive
    private Integer qty;
}