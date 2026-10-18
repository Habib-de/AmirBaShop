package co.ke.amirbabyshop.dto.coupon;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ValidateCouponResponse {
    private boolean valid;
    private String code;
    private String type;            // percent | fixed | freeship
    private BigDecimal discount;    // KES amount to subtract
    private String message;
}