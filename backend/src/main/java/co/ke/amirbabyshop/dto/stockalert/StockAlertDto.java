package co.ke.amirbabyshop.dto.stockalert;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class StockAlertDto {
    private String id;
    private Long productId;
    private String size;
    private String color;
    private String email;
    private boolean notified;
    private Instant notifiedAt;
    private Instant createdAt;
}