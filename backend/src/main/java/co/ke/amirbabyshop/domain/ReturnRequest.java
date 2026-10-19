package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "returns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnRequest {

    @Id
    @Column(length = 30)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "order_id", nullable = false, length = 30)
    private String orderId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(name = "customer_email", length = 190)
    private String customerEmail;

    @Column(length = 80)
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(length = 20, columnDefinition = "ENUM('pending','approved','rejected','completed')")
    private String status;

    @Column(name = "rejection_reason", length = 300)
    private String rejectionReason;

    @Column(name = "refund_amount", precision = 12, scale = 2)
    private java.math.BigDecimal refundAmount;

    @Column(columnDefinition = "JSON")
    private String items;

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = "pending";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}