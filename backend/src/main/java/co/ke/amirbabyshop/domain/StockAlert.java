package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "stock_alerts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockAlert {

    @Id
    @Column(length = 50)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(length = 40)
    private String size;

    @Column(length = 40)
    private String color;

    @Column(nullable = false, length = 190)
    private String email;

    @Column(name = "notified_flag", nullable = false)
    private Integer notifiedFlag;

    @Column(name = "notified_at", columnDefinition = "TIMESTAMP")
    private Instant notifiedAt;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (notifiedFlag == null) notifiedFlag = 0;
        if (id == null) {
            id = "SA-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }
}