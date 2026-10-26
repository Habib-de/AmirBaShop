package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "tenants")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Tenant {

    @Id
    @Column(length = 50)
    private String id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 60, unique = true)
    private String slug;

    @Column(name = "owner_email", nullable = false, length = 190)
    private String ownerEmail;

    @Column(name = "logo_url", length = 500)
    private String logoUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 30)
    private String phone;

    @Column(length = 190)
    private String email;

    @Column(name = "address_street", length = 200)
    private String addressStreet;

    @Column(name = "address_city", length = 100)
    private String addressCity;

    @Column(name = "address_country", length = 60)
    private String addressCountry;

    @Column(precision = 10, scale = 7)
    private BigDecimal lat;

    @Column(precision = 10, scale = 7)
    private BigDecimal lng;

        @Column(length = 3, columnDefinition = "CHAR(3)")
    private String currency;

    /* ─── M-Pesa payment details (used by checkout) ─── */
    @Column(name = "mpesa_paybill", length = 20)
    private String mpesaPaybill;

    @Column(name = "mpesa_account_prefix", length = 20)
    private String mpesaAccountPrefix;

    @Column(length = 20, columnDefinition = "ENUM('active','suspended','closed')")
    private String status;

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @Column(name = "deleted_at", columnDefinition = "TIMESTAMP")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = "active";
        if (currency == null) currency = "KES";
        if (addressCountry == null) addressCountry = "Kenya";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}