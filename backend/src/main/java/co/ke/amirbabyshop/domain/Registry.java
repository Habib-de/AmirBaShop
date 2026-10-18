package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "registries")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Registry {

    @Id
    @Column(length = 20)
    private String id;

    @Column(nullable = false, length = 40, unique = true)
    private String slug;

    @Column(name = "owner_user_id", nullable = false)
    private Long ownerUserId;

    @Column(name = "owner_email", nullable = false, length = 190)
    private String ownerEmail;

    @Column(name = "owner_name", length = 120)
    private String ownerName;

    @Column(name = "baby_name", length = 120)
    private String babyName;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(length = 120)
    private String theme;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(columnDefinition = "JSON")
    private String items;      // JSON array: [{id, productId, name, image, price, priority, note, addedAt}]

    @Column(columnDefinition = "JSON")
    private String gifts;      // JSON array: [{id, itemId, giverName, giverEmail, message, qty, giftedAt, thanked}]

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (items == null) items = "[]";
        if (gifts == null) gifts = "[]";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}