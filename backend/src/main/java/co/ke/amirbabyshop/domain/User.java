package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", length = 50)
    private String tenantId;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 190, unique = true)
    private String email;

    @Column(length = 30)
    private String phone;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, length = 20, columnDefinition = "ENUM('owner','sales','customer')")
    private String role;

    @Column(nullable = false, length = 20, columnDefinition = "ENUM('pending','active','rejected','suspended')")
    private String status;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "last_login_at", columnDefinition = "TIMESTAMP")
    private Instant lastLoginAt;

    @Column(name = "approved_at", columnDefinition = "TIMESTAMP")
    private Instant approvedAt;

    @Column(name = "rejected_at", columnDefinition = "TIMESTAMP")
    private Instant rejectedAt;

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
        if (role == null) role = "customer";
        if (status == null) status = "active";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}