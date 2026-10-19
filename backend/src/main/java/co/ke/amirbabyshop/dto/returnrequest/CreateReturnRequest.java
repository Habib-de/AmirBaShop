package co.ke.amirbabyshop.dto.returnrequest;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class CreateReturnRequest {

    @NotBlank
    private String orderId;

    @NotBlank
    private String reason;

    private String note;

    @NotEmpty
    private List<Map<String, Object>> items;

    // Filled in by the controller
    private String customerName;
    private String customerEmail;
    private Long userId;
}