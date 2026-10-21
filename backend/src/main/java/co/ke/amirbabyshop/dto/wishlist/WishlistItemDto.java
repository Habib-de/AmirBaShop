package co.ke.amirbabyshop.dto.wishlist;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
public class WishlistItemDto {
    private Long productId;
    private String name;
    private String imageUrl;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String badge;
    private Integer totalStock;
    private Integer categoryId;
    private Instant addedAt;
}