package co.ke.amirbabyshop.service;

import co.ke.amirbabyshop.domain.Product;
import co.ke.amirbabyshop.domain.ProductVariant;
import co.ke.amirbabyshop.domain.StockMovement;
import co.ke.amirbabyshop.repository.ProductRepository;
import co.ke.amirbabyshop.repository.ProductVariantRepository;
import co.ke.amirbabyshop.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class StockMovementService {

    private final StockMovementRepository movementRepository;
    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;

    /**
     * Record a stock movement. This is the ONLY method that should ever
     * insert into stock_movements. Every stock change path calls this.
     *
     * @param tenantId      shop ID
     * @param productId     product being changed
     * @param variantId     specific variant, or null if product has no variants
     * @param delta         +5 (restock), -3 (sale), -1 (damage) — never 0
     * @param previousStock stock BEFORE this movement
     * @param newStock      stock AFTER this movement
     * @param reason        'sale','return','restock','adjustment','damage','transfer','initial'
     * @param reference     order ID, return ID, or null
     * @param notes         free text
     * @param userId        who did it (null for system/customer-triggered)
     * @param userName      display name
     * @param userRole      'owner','sales','customer','guest'
     */
    @Transactional
    public void record(String tenantId,
                       Long productId,
                       Long variantId,
                       int delta,
                       int previousStock,
                       int newStock,
                       String reason,
                       String reference,
                       String notes,
                       Long userId,
                       String userName,
                       String userRole) {

        // Never record a no-op
        if (delta == 0) {
            log.debug("[StockMovement] Skipping delta=0 for product {}", productId);
            return;
        }

        try {
            Product product = productRepository.findById(productId).orElse(null);
            if (product == null) {
                log.warn("[StockMovement] Product {} not found — skipping audit", productId);
                return;
            }

            ProductVariant variant = null;
            if (variantId != null) {
                variant = variantRepository.findById(variantId).orElse(null);
            }

            StockMovement m = StockMovement.builder()
                    .tenantId(tenantId)
                    .product(product)
                    .variant(variant)
                    .delta(delta)
                    .previousStock(previousStock)
                    .newStock(newStock)
                    .reason(reason != null ? reason : "adjustment")
                    .reference(reference)
                    .notes(notes)
                    .userId(userId)
                    .userName(userName != null ? userName : "System")
                    .userRole(userRole != null ? userRole : "system")
                    .build();

            movementRepository.save(m);

            log.info("[StockMovement] {} #{} — {} {} ({} → {}) by {} [{}]",
                    product.getName(),
                    variant != null ? variant.getId() : "whole",
                    delta > 0 ? "+" : "",
                    delta,
                    previousStock,
                    newStock,
                    userName != null ? userName : "System",
                    reason);

        } catch (Exception e) {
            // Never fail the parent transaction because of an audit failure
            log.error("[StockMovement] Failed to record: {}", e.getMessage(), e);
        }
    }

    /* ═══════════════ QUERIES ═══════════════ */

    @Transactional(readOnly = true)
    public Page<StockMovement> historyForProduct(Long productId, Pageable pageable) {
        return movementRepository.findByProductIdOrderByCreatedAtDesc(productId, pageable);
    }

    @Transactional(readOnly = true)
    public java.util.List<StockMovement> historyForVariant(Long variantId) {
        return movementRepository.findByVariantIdOrderByCreatedAtDesc(variantId);
    }

    @Transactional(readOnly = true)
    public Page<StockMovement> historyForTenant(String tenantId,
                                                 Instant from,
                                                 Instant to,
                                                 Pageable pageable) {
        return movementRepository.findByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(
                tenantId, from, to, pageable);
    }
}