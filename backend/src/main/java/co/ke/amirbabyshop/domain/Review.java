package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "author_name", nullable = false, length = 120)
    private String authorName;

    @Column(name = "author_email", length = 190)
    private String authorEmail;

    @Column(name = "author_role", length = 20,
            columnDefinition = "ENUM('owner','sales','customer','guest')")
    private String authorRole;

    /* ↓↓↓ THE FIX — columnDefinition added ↓↓↓ */
    @Column(nullable = false, columnDefinition = "TINYINT")
    private Integer rating;

    @Column(length = 120)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(columnDefinition = "JSON")
    private String photos;      // JSON array of { full, thumb }

    @Column(columnDefinition = "TINYINT(1)")
    private Boolean verified;

    private Integer helpful;

    @Column(name = "not_helpful")
    private Integer notHelpful;

    @Column(length = 20, columnDefinition = "ENUM('published','hidden')")
    private String status;

    @Column(columnDefinition = "JSON")
    private String replies;     // JSON array of { id, text, author, role, createdAt }

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (authorRole == null) authorRole = "customer";
        if (verified == null) verified = false;
        if (helpful == null) helpful = 0;
        if (notHelpful == null) notHelpful = 0;
        if (status == null) status = "published";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}