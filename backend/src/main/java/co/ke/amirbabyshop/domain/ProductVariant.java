package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(
    name = "product_variants",
    uniqueConstraints = @UniqueConstraint(
        name = "uniq_product_size_color",
        columnNames = { "product_id", "size", "color" }
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductVariant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(length = 40)
    private String size;

    @Column(length = 40)
    private String color;

    @Column(length = 60, unique = true)
    private String sku;

    @Column(length = 60)
    private String barcode;

    @Column(name = "weight_grams")
    private Integer weightGrams;

    @Column(nullable = false)
    private Integer stock;

    @Column(name = "price_override", precision = 12, scale = 2)
    private BigDecimal priceOverride;

    @Column(name = "low_stock_threshold")
    private Integer lowStockThreshold;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_active")
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
        if (stock == null) stock = 0;
        if (weightGrams == null) weightGrams = 0;
        if (lowStockThreshold == null) lowStockThreshold = 10;
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /* ─── Convenience helper ─── */
    /* A variant has a "label" for UI display: "0-3M · Pink" or "Natural" or "Standard" */
    @Transient
    public String getLabel() {
        if (size == null && color == null) return "Standard";
        if (size == null) return color;
        if (color == null) return size;
        return size + " · " + color;
    }
}