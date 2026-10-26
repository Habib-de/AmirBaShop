package co.ke.amirbabyshop.dto.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDto {

    private String id;
    private String tenantId;
    private Long userId;
    private String status;

    /* Totals */
    private BigDecimal subtotal;
    private BigDecimal discount;
    private BigDecimal tax;
    private BigDecimal shipping;
    private BigDecimal total;

    /* Coupon snapshot */
    private String couponCode;
    private Long couponId;

    /* Customer snapshot */
    private String customerName;
    private String customerEmail;
    private String customerPhone;
    private String addressStreet;
    private String addressCity;
    private String addressZip;

        /* Payment */
    private String paymentMethod;
    private String paymentStatus;
    private String paymentFlow;             // 'manual_paybill' | 'stk_push' | 'cod'
    private String mpesaReceiptCode;        // set once paid via M-Pesa
    private String mpesaCheckoutRequestId;  // Daraja's checkout ID (may expose to client for debugging)

    /* Tracking */
    private String carrierId;
    private String carrierName;
    private String trackingNumber;
    private Instant eta;
    private List<Map<String, Object>> checkpoints;   // parsed JSON

    /* Placed by */
    private Long placedById;
    private String placedByName;
    private String placedByRole;

    private String notes;

    private String registryGiftId;

    private List<OrderItemDto> items;

    private Instant createdAt;
    private Instant updatedAt;
}