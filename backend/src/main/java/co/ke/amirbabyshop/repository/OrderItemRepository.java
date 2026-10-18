package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    List<OrderItem> findByOrderId(String orderId);
}