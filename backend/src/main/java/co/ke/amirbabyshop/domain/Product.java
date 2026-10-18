package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "category_id")
    private Integer categoryId;

    @Column(length = 60)
    private String sku;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "original_price", precision = 12, scale = 2)
    private BigDecimal originalPrice;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(length = 40)
    private String badge;

    @Column(name = "rating_avg", precision = 3, scale = 2)
    private BigDecimal ratingAvg;

    @Column(name = "review_count")
    private Integer reviewCount;

    @Column(name = "total_stock", nullable = false)
    private Integer totalStock;

    @Column(columnDefinition = "JSON")
    private String sizes;

    @Column(columnDefinition = "JSON")
    private String colors;

    @Column(columnDefinition = "JSON")
    private String variants;

    @Column(name = "is_active", columnDefinition = "TINYINT(1)")
    private Boolean isActive;

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
        if (isActive == null) isActive = true;
        if (totalStock == null) totalStock = 0;
        if (reviewCount == null) reviewCount = 0;
        if (ratingAvg == null) ratingAvg = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}