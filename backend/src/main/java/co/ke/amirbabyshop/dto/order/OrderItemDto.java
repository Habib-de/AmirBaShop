package co.ke.amirbabyshop.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemDto {
    private Long id;
    private Long productId;
    private String name;
    private String imageUrl;
    private String category;
    private BigDecimal price;
    private Integer qty;
    private String size;
    private String color;
    private BigDecimal subtotal;
}