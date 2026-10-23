package co.ke.amirbabyshop.dto.stockalert;

import lombok.Data;

@Data
public class CreateStockAlertRequest {
    private Long productId;
    private String size;
    private String color;
    private String email;
}