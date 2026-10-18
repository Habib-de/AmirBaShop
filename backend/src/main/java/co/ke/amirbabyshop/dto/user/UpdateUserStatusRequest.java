package co.ke.amirbabyshop.dto.user;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateUserStatusRequest {

    @NotBlank
    private String status;   // active | rejected | suspended
}