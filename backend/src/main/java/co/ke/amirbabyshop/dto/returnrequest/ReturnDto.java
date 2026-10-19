package co.ke.amirbabyshop.dto.returnrequest;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReturnDto {
    private String id;
    private String orderId;
    private Long userId;
    private String customerName;
    private String customerEmail;
    private String reason;
    private String note;
    private String status;
    private String rejectionReason;
    private BigDecimal refundAmount;
    private List<Map<String, Object>> items;
    private Instant createdAt;
    private Instant updatedAt;
}