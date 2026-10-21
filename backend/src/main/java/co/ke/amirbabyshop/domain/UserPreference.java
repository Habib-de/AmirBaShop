package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_preferences")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPreference {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(length = 3, columnDefinition = "CHAR(3)")
    private String currency;

    @Column(length = 20, columnDefinition = "ENUM('light','dark')")
    private String theme;

    @Column(length = 10)
    private String language;

    @Column(columnDefinition = "JSON")
    private String notifications;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
        if (currency == null) currency = "KES";
        if (theme == null) theme = "light";
        if (language == null) language = "en";
    }
}