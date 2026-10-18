package co.ke.amirbabyshop.dto.registry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AddRegistryItemRequest {

    @NotNull
    private Long productId;

    @NotBlank
    @Size(max = 200)
    private String name;

    @Size(max = 500)
    private String image;

    @NotNull
    private BigDecimal price;

    @Size(max = 60)
    private String category;

    @Pattern(regexp = "low|medium|high", message = "priority must be low, medium, or high")
    private String priority = "medium";

    @Size(max = 500)
    private String note;
}