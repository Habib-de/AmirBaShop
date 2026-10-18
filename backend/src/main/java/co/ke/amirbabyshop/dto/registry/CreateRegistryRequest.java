package co.ke.amirbabyshop.dto.registry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateRegistryRequest {

    @NotBlank
    @Size(min = 1, max = 120)
    private String babyName;

    @NotNull
    private LocalDate dueDate;

    @Size(max = 120)
    private String theme;

    @Size(max = 2000)
    private String message;

    @Size(max = 500)
    private String coverImageUrl;

    /* Filled by the controller from the JWT principal — never sent by client. */
    private Long ownerUserId;
    private String ownerEmail;
    private String ownerName;
}