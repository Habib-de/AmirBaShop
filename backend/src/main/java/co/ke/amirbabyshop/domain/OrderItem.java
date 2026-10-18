package co.ke.amirbabyshop.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "order_id", nullable = false, length = 30)
    private String orderId;

    @Column(name = "product_id")
    private Long productId;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(length = 60)
    private String category;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price;

    @Column(nullable = false)
    private Integer qty;

    @Column(length = 40)
    private String size;

    @Column(length = 40)
    private String color;

    /* subtotal is GENERATED ALWAYS in the DB — read-only from JPA */
    @Column(insertable = false, updatable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;
}