package co.ke.amirbabyshop.dto.registry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GiftRegistryItemRequest {

    @NotBlank
    @Size(max = 120)
    private String giverName;

    @Size(max = 190)
    private String giverEmail;

    @Size(max = 500)
    private String message;

    private Integer qty = 1;
}