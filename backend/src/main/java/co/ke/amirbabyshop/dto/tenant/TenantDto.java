package co.ke.amirbabyshop.dto.tenant;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDto {
    private String id;
    private String name;
    private String slug;
    private String ownerEmail;
    private String logoUrl;
    private String description;
    private String phone;
    private String email;
    private String addressStreet;
    private String addressCity;
    private String addressCountry;
    private BigDecimal lat;
    private BigDecimal lng;
    private String currency;
    private String status;
    private Instant createdAt;
    private Instant updatedAt;
}