package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @Column(length = 40)
    private String id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "user_email", length = 190)
    private String userEmail;

    @Column(length = 20, columnDefinition = "ENUM('order','review','promo','system','info')")
    private String type;

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(length = 300)
    private String link;

    @Column(name = "is_read")
    private Boolean isRead;

    @Column(name = "created_at", columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
        if (isRead == null) isRead = false;
        if (type == null) type = "info";
        if (id == null) {
            id = "NT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
    }
}