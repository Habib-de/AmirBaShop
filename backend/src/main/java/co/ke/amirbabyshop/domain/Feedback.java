package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "feedback")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Feedback {

    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "tenant_id", nullable = false, length = 50)
    private String tenantId;

    @Column(name = "user_id")
    private Long userId;

    @Column(length = 120)
    private String name;

    @Column(length = 190)
    private String email;

    @Column(length = 200)
    private String subject;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "sent_by", length = 20, columnDefinition = "ENUM('owner','sales','customer','guest')")
    private String sentBy;

    @Column(length = 20, columnDefinition = "ENUM('unread','read','resolved')")
    private String status;

    @Column(columnDefinition = "JSON")
    private String replies;

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
        if (status == null) status = "unread";
        if (sentBy == null) sentBy = "guest";
        if (replies == null) replies = "[]";
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}