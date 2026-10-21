package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "currency_rates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CurrencyRate {

    @Id
    @Column(name = "currency_code", length = 3, columnDefinition = "CHAR(3)")
    private String currencyCode;

    @Column(name = "kes_per_unit", nullable = false, precision = 12, scale = 4)
    private BigDecimal kesPerUnit;

    @Column(length = 8)
    private String symbol;

    @Column(length = 60)
    private String label;

    @Column(name = "updated_at", columnDefinition = "TIMESTAMP")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    void touch() {
        updatedAt = Instant.now();
    }
}