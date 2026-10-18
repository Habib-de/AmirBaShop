package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "review_votes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "review_id", nullable = false)
    private Long reviewId;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "guest_token", length = 100)
    private String guestToken;

    @Column(nullable = false, length = 10, columnDefinition = "ENUM('up','down')")
    private String vote;

    @Column(name = "created_at", updatable = false, columnDefinition = "TIMESTAMP")
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}