package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(nullable = false, length = 60)
    private String slug;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(length = 20)
    private String icon;

    @Column(name = "sort_order")
    private Integer sortOrder;

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
        if (isActive == null) isActive = true;
        if (sortOrder == null) sortOrder = 0;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}