package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.common.exception.ApiException;
import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.domain.StockAlert;
import co.ke.amirbabyshop.dto.stockalert.CreateStockAlertRequest;
import co.ke.amirbabyshop.dto.stockalert.StockAlertDto;
import co.ke.amirbabyshop.repository.ProductRepository;
import co.ke.amirbabyshop.repository.StockAlertRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StockAlertService {

    private final StockAlertRepository stockAlertRepository;
    private final ProductRepository productRepository;
    private final NotificationService notificationService;

    @Transactional
    public StockAlertDto subscribe(String tenantId, CreateStockAlertRequest req) {
        if (req.getProductId() == null) {
            throw new ApiException("Product is required", HttpStatus.UNPROCESSABLE_ENTITY);
        }
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();
        if (email.isEmpty()) {
            throw new ApiException("Email is required", HttpStatus.UNPROCESSABLE_ENTITY);
        }

        Product p = productRepository.findByIdAndTenantId(req.getProductId(), tenantId)
                .orElseThrow(() -> new ApiException("Product not found", HttpStatus.NOT_FOUND));

        String size = blankToNull(req.getSize());
        String color = blankToNull(req.getColor());

        // Reject duplicates of pending alert
        stockAlertRepository
                .findByProductIdAndSizeAndColorAndEmailAndNotifiedFlag(
                        req.getProductId(), size, color, email, 0)
                .ifPresent(a -> { throw new ApiException(
                        "You're already subscribed for this variant", HttpStatus.CONFLICT); });

        StockAlert alert = StockAlert.builder()
                .tenantId(tenantId)
                .productId(req.getProductId())
                .size(size)
                .color(color)
                .email(email)
                .notifiedFlag(0)
                .build();

        stockAlertRepository.save(alert);
        return toDto(alert);
    }

    @Transactional(readOnly = true)
    public List<StockAlertDto> listMine(String email) {
        if (email == null || email.isBlank()) return List.of();
        return stockAlertRepository.findByEmailOrderByCreatedAtDesc(email.trim().toLowerCase())
                .stream().map(this::toDto).toList();
    }

    /**
     * Called by ProductService when stock goes from 0 → positive for a variant.
     * Notifies all pending subscribers for that variant.
     */
    @Transactional
    public int notifyRestock(String tenantId, Long productId, String size, String color, String productName) {
        String s = blankToNull(size);
        String c = blankToNull(color);
        List<StockAlert> pending = stockAlertRepository
                .findByProductIdAndSizeAndColorAndNotifiedFlag(productId, s, c, 0);

        for (StockAlert a : pending) {
            notificationService.createForEmail(
                    a.getEmail(),
                    "info",
                    "Back in stock: " + (productName == null ? "a product you wanted" : productName),
                    "The " + formatVariant(s, c) + " variant is available again. Order now!",
                    "/product/" + productId
            );
            a.setNotifiedFlag(1);
            a.setNotifiedAt(Instant.now());
            stockAlertRepository.save(a);
        }
        return pending.size();
    }

    private static String formatVariant(String size, String color) {
        if (size == null && color == null) return "item";
        if (size == null) return color;
        if (color == null) return size;
        return size + " / " + color;
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private StockAlertDto toDto(StockAlert a) {
        return StockAlertDto.builder()
                .id(a.getId())
                .productId(a.getProductId())
                .size(a.getSize())
                .color(a.getColor())
                .email(a.getEmail())
                .notified(a.getNotifiedFlag() != null && a.getNotifiedFlag() == 1)
                .notifiedAt(a.getNotifiedAt())
                .createdAt(a.getCreatedAt())
                .build();
    }
}