package co.ke.amirbabyshop.dto.coupon;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ValidateCouponRequest {

    @NotBlank
    private String code;

    @NotNull
    private BigDecimal subtotal;

    private String tenantId;
}