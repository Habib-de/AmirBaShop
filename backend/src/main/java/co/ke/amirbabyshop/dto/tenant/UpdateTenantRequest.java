package co.ke.amirbabyshop.dto.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class UpdateTenantRequest {

    @NotBlank(message = "Shop name is required")
    @Size(min = 2, max = 120)
    private String name;

    @Size(max = 30)
    private String phone;

    @Email
    @Size(max = 190)
    private String email;

    @Size(max = 200)
    private String addressStreet;

    @Size(max = 100)
    private String addressCity;

    @Size(max = 60)
    private String addressCountry;

    private BigDecimal lat;
    private BigDecimal lng;

    @Size(max = 3)
    private String currency;

    @Size(max = 500)
    private String logoUrl;

    @Size(max = 2000)
    private String description;
}