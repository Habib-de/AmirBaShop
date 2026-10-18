package co.ke.amirbabyshop.dto.coupon;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CouponDto {
    private Long id;
    private String code;
    private String type;            // percent | fixed | freeship
    private BigDecimal value;
    private BigDecimal minOrder;
    private Integer maxUses;
    private Integer uses;
    private Instant expiresAt;
    private Boolean isActive;
    private Instant createdAt;
}