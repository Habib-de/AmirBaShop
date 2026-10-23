package co.ke.amirbabyshop.repository;

import co.ke.amirbabyshop.domain.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StockAlertRepository extends JpaRepository<StockAlert, String> {

    Optional<StockAlert> findByProductIdAndSizeAndColorAndEmailAndNotifiedFlag(
            Long productId, String size, String color, String email, Integer notifiedFlag);

    List<StockAlert> findByProductIdAndSizeAndColorAndNotifiedFlag(
            Long productId, String size, String color, Integer notifiedFlag);

    List<StockAlert> findByEmailOrderByCreatedAtDesc(String email);
}