package co.ke.amirbabyshop.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Lightweight order shape for lists (My Orders, admin Orders list).
 * Includes top 3 items for the thumbnail strip + full item count.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderSummaryDto {
    private String id;
    private String status;
    private String customerName;
    private String customerEmail;
    private BigDecimal total;
    private Integer itemCount;
    private List<OrderItemDto> sampleItems;   // first 3
    private String trackingNumber;
    private String carrierName;
    private Instant eta;
    private String registryGiftId; 
    private Instant createdAt;
}