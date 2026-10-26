package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @Column(length = 30)                 // ← VARCHAR(30), not BIGINT
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "user_id")
    private Long userId;

    @Column(nullable = false, length = 20,
            columnDefinition = "ENUM('pending','confirmed','fulfilled','cancelled')")
    private String status;

    /* ─── Totals (KES) ─── */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discount;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal tax;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal shipping;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    /* ─── Coupon snapshot ─── */
    @Column(name = "coupon_code", length = 40)
    private String couponCode;

    @Column(name = "coupon_id")
    private Long couponId;

    /* ─── Customer snapshot ─── */
    @Column(name = "customer_name", length = 120)
    private String customerName;

    @Column(name = "customer_email", length = 190)
    private String customerEmail;

    @Column(name = "customer_phone", length = 30)
    private String customerPhone;

    @Column(name = "address_street", length = 200)
    private String addressStreet;

    @Column(name = "address_city", length = 100)
    private String addressCity;

    @Column(name = "address_zip", length = 20)
    private String addressZip;

        /* ─── Payment ─── */
    @Column(name = "payment_method", length = 20,
            columnDefinition = "ENUM('cod','momo','mpesa')")
    private String paymentMethod;

    @Column(name = "payment_status", length = 20,
            columnDefinition = "ENUM('unpaid','paid','refunded')")
    private String paymentStatus;

    /* For M-Pesa orders: which sub-flow did the customer pick?
       - manual_paybill : customer pays via paybill + submits receipt code
       - stk_push       : we trigger Daraja push to their phone
       Null for other methods. */
    @Column(name = "payment_flow", length = 20,
            columnDefinition = "ENUM('manual_paybill','stk_push','cod')")
    private String paymentFlow;

    /* M-Pesa confirmation code the customer types in (Commit 2). */
    @Column(name = "mpesa_receipt_code", length = 20)
    private String mpesaReceiptCode;

    /* Daraja's CheckoutRequestID — used to match callbacks idempotently (Commit 3). */
    @Column(name = "mpesa_checkout_request_id", length = 60)
    private String mpesaCheckoutRequestId;

    /* ─── Tracking ─── */
    @Column(name = "carrier_id", length = 30)
    private String carrierId;

    @Column(name = "carrier_name", length = 80)
    private String carrierName;

    @Column(name = "tracking_number", length = 60)
    private String trackingNumber;

    @Column(name = "eta", columnDefinition = "TIMESTAMP")
    private Instant eta;

    @Column(columnDefinition = "JSON")
    private String checkpoints;

    /* ─── Who placed it ─── */
    @Column(name = "placed_by_id")
    private Long placedById;

    @Column(name = "placed_by_name", length = 120)
    private String placedByName;

    @Column(name = "placed_by_role", length = 20,
            columnDefinition = "ENUM('owner','sales','customer','guest')")
    private String placedByRole;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "registry_gift_id", length = 20)
    private String registryGiftId;

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
        if (status == null) status = "pending";
        if (subtotal == null) subtotal = BigDecimal.ZERO;
        if (discount == null) discount = BigDecimal.ZERO;
        if (tax == null) tax = BigDecimal.ZERO;
        if (shipping == null) shipping = BigDecimal.ZERO;
        if (total == null) total = BigDecimal.ZERO;
        if (paymentStatus == null) paymentStatus = "unpaid";
        if (placedByRole == null) placedByRole = "guest";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}