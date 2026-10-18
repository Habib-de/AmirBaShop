package co.ke.amirbabyshop.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank(message = "Name is required")
    @Size(min = 2, max = 120)
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Size(max = 30)
    private String phone;

    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be 6-100 characters")
    private String password;

    /** customer | sales | owner */
    private String role = "customer";

    /** Required for sales/customer — the shop they belong to */
    private String tenantId;

    /** Required only when role=owner */
    private String shopName;
}