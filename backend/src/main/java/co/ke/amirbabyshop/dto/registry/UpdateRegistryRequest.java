package co.ke.amirbabyshop.dto.registry;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateRegistryRequest {

    @Size(max = 120)
    private String babyName;

    private LocalDate dueDate;

    @Size(max = 120)
    private String theme;

    @Size(max = 2000)
    private String message;

    @Size(max = 500)
    private String coverImageUrl;
}