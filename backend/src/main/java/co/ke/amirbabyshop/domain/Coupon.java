package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "coupons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Coupon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(nullable = false, length = 40)
    private String code;

    @Column(nullable = false, length = 20, columnDefinition = "ENUM('percent','fixed','freeship')")
    private String type;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal value;

    @Column(name = "min_order", precision = 12, scale = 2)
    private BigDecimal minOrder;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(nullable = false)
    private Integer uses;

    @Column(name = "expires_at", columnDefinition = "TIMESTAMP")
    private Instant expiresAt;

    @Column(name = "is_active", columnDefinition = "TINYINT(1)")
    private Boolean isActive;

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (uses == null) uses = 0;
        if (maxUses == null) maxUses = 0;
        if (minOrder == null) minOrder = BigDecimal.ZERO;
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}